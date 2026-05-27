"""
Flask server for the bilingual listing translation service.

Endpoints:
  POST /translate/listing      — translate one listing
  POST /translate/listings     — translate a batch of listings
  POST /translate/text         — translate a single string (debug/test)
  GET  /healthz                — liveness (always 200 if process is up)
  GET  /readyz                 — readiness (200 only after models loaded)

Run for development:  python app.py
Run for production:   gunicorn -c gunicorn_conf.py app:app
"""

import logging
import os
from typing import Any

from flask import Flask, jsonify, request

from translator import BilingualTranslator
from inference_worker import InferenceWorker
from listing_pipeline import translate_listings


logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("translation_api")


REQUEST_TIMEOUT_S = float(os.environ.get("TRANSLATION_TIMEOUT_S", "60"))
MAX_LISTINGS_PER_REQUEST = int(os.environ.get("MAX_LISTINGS_PER_REQUEST", "50"))
INTERNAL_SERVICE_TOKEN = os.environ.get("INTERNAL_SERVICE_TOKEN", "").strip()

app = Flask(__name__)

# Build these once at import time so Gunicorn workers have them ready before
# they start handling traffic. With workers=1 (see gunicorn_conf.py) this means
# the models are loaded exactly once into GPU memory.
log.info("Initializing translator (this will load models)...")
_translator = BilingualTranslator()
_worker = InferenceWorker(_translator)
log.info("Service ready.")


def _bad_request(message: str, **extra: Any):
    payload = {"error": message, **extra}
    return jsonify(payload), 400


@app.before_request
def enforce_internal_auth():
    if request.path in ("/healthz", "/readyz"):
        return None

    if INTERNAL_SERVICE_TOKEN:
        token = request.headers.get("X-Internal-Auth", "")
        if token != INTERNAL_SERVICE_TOKEN:
            return jsonify({"error": "Unauthorized"}), 401

    return None


@app.get("/healthz")
def healthz():
    return jsonify({"status": "ok"})


@app.get("/readyz")
def readyz():
    if _worker._thread.is_alive():
        return jsonify({"status": "ready", "device": str(_translator.device)})
    return jsonify({"status": "not_ready"}), 503


@app.post("/translate/listing")
def translate_listing_endpoint():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _bad_request("Request body must be a JSON object representing a listing.")
    try:
        result = translate_listings([payload], _worker, timeout=REQUEST_TIMEOUT_S)[0]
        return jsonify(result)
    except TimeoutError as e:
        log.warning("Translation timeout: %s", e)
        return jsonify({"error": "translation_timeout"}), 504
    except Exception:
        log.exception("Translation failed")
        return jsonify({"error": "internal_error"}), 500


@app.post("/translate/listings")
def translate_listings_endpoint():
    payload = request.get_json(silent=True)
    if not isinstance(payload, list):
        return _bad_request("Request body must be a JSON array of listings.")
    if len(payload) == 0:
        return jsonify([])
    if len(payload) > MAX_LISTINGS_PER_REQUEST:
        return _bad_request(
            f"Too many listings in one request (max {MAX_LISTINGS_PER_REQUEST}).",
            limit=MAX_LISTINGS_PER_REQUEST,
            received=len(payload),
        )
    if not all(isinstance(x, dict) for x in payload):
        return _bad_request("Every item in the listings array must be an object.")
    try:
        results = translate_listings(payload, _worker, timeout=REQUEST_TIMEOUT_S)
        return jsonify(results)
    except TimeoutError as e:
        log.warning("Translation timeout: %s", e)
        return jsonify({"error": "translation_timeout"}), 504
    except Exception:
        log.exception("Translation failed")
        return jsonify({"error": "internal_error"}), 500


@app.post("/translate/text")
def translate_text_endpoint():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _bad_request("Body must be JSON: {text, src, tgt}.")
    text = payload.get("text")
    src = payload.get("src")
    tgt = payload.get("tgt")
    if not isinstance(text, str) or src not in ("en", "ar") or tgt not in ("en", "ar"):
        return _bad_request("Required: text (str), src ('en'|'ar'), tgt ('en'|'ar').")
    try:
        result = _worker.submit([text], src, tgt, timeout=REQUEST_TIMEOUT_S)[0]
        return jsonify({"translation": result})
    except TimeoutError:
        return jsonify({"error": "translation_timeout"}), 504
    except Exception:
        log.exception("Translation failed")
        return jsonify({"error": "internal_error"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), threaded=True)
