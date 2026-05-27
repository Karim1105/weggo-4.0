# Bilingual Listing Translation API

Flask service that translates marketplace listings between Arabic and English.
Both models stay resident on the GPU; concurrent requests are batched into a
single forward pass by a dedicated worker thread.

## Files

- `translator.py` — model loading, GPU placement, batched generation
- `inference_worker.py` — single worker thread that owns the GPU and batches
  concurrent requests through a queue
- `listing_pipeline.py` — listing-shape logic (field detection, numeric
  conversion, source/target language picking, stitching translations back)
- `app.py` — Flask app and HTTP endpoints
- `gunicorn_conf.py` — production server config (workers=1, threads=N)

## Architecture

```
HTTP request ─┐
HTTP request ─┼─► Flask threads ─► InferenceWorker.submit() ─► queue
HTTP request ─┘                                                  │
                                                                 ▼
                                              single worker thread
                                              drains queue, batches by direction,
                                              one GPU call per direction,
                                              fans results back to waiting threads
```

A single GPU can only run one `generate()` at a time. Multiple Flask workers
fighting over it is slower than one worker that batches. So: 1 process,
many request threads, 1 inference thread.

## Run

### Development
```
pip install -r requirements.txt
python app.py
```

### Production
```
gunicorn -c gunicorn_conf.py app:app
```

## Endpoints

- `POST /translate/listing` — body: one listing JSON, response: translated listing
- `POST /translate/listings` — body: array of listings, response: array of translated
- `POST /translate/text` — body: `{text, src, tgt}`, response: `{translation}`
- `GET /healthz` — liveness
- `GET /readyz` — readiness (200 once models are loaded and worker is alive)

## Tunables (environment variables)

- `TRANSLATION_TIMEOUT_S` (default 60) — per-request timeout
- `MAX_LISTINGS_PER_REQUEST` (default 50) — input size cap
- `GUNICORN_THREADS` (default 16) — concurrent HTTP connections
- `GUNICORN_TIMEOUT` (default 120) — gunicorn worker timeout (>= translation timeout)

Inside the code:
- `inference_worker.BATCH_WINDOW_MS` — coalescing window for batching (20ms)
- `inference_worker.MAX_BATCH_TEXTS` — max texts per GPU call (64)

## Example

```bash
curl -X POST http://localhost:8000/translate/listing \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "De'\''Longhi Dedica Espresso Machine",
    "description": "Used for 2 years, works great.",
    "brand": "De'\''Longhi",
    "category": "Home & Garden",
    "price": 130
  }'
```
