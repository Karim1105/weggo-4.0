"""
Translator core: model loading, GPU placement, batched generation.

Imported by the Flask app; not used standalone in production. Pure inference
logic — no HTTP, no queueing. The server layer wraps this with a request queue
and a single worker thread for safe concurrent GPU use.
"""

import re
from typing import Any, Dict, List, Union

import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM


EN_AR_MODEL = "Helsinki-NLP/opus-mt-tc-big-en-ar"
AR_EN_MODEL = "Helsinki-NLP/opus-mt-ar-en"

FIELDS_TO_TRANSLATE = [
    "title",
    "description",
    "brand",
    "category",
    "subcategory",
    "condition",
    "price",
    "sellerProfile.rating",
]

GENERATION_KWARGS = dict(
    max_new_tokens=512,
    num_beams=4,
    no_repeat_ngram_size=3,
    repetition_penalty=1.2,
    early_stopping=True,
)

EN_TO_AR_DIGITS = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")
AR_TO_EN_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
ARABIC_CHAR_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]")
_LOCALIZE_TOKEN_RE = re.compile(
    r"[A-Za-z0-9\u0660-\u0669]+(?:[.\u066B][A-Za-z0-9\u0660-\u0669]+)?"
)


def localize_digits(text: str, tgt: str) -> str:
    if not isinstance(text, str) or not text:
        return text
    table = EN_TO_AR_DIGITS if tgt == "ar" else AR_TO_EN_DIGITS

    def _replace(match: "re.Match[str]") -> str:
        token = match.group(0)
        first = token[0]
        if "A" <= first <= "Z" or "a" <= first <= "z":
            return token
        return token.translate(table)

    return _LOCALIZE_TOKEN_RE.sub(_replace, text)


class BilingualTranslator:
    """Loads both models at construction time. All translation calls block on
    the GPU, so in a server context this must be called only from a single
    dedicated worker thread."""

    def __init__(self, device: Union[str, None] = None):
        if device is None:
            if torch.cuda.is_available():
                device = "cuda"
            elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
                device = "mps"
            else:
                device = "cpu"
        self.device = torch.device(device)

        self._tokenizers: Dict[str, Any] = {}
        self._models: Dict[str, Any] = {}

        for direction, model_name in [("en->ar", EN_AR_MODEL), ("ar->en", AR_EN_MODEL)]:
            print(f"[translator] Loading {model_name} onto {self.device} ...", flush=True)
            self._tokenizers[direction] = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(self.device)
            model.eval()
            self._models[direction] = model
        print(f"[translator] Ready on {self.device}", flush=True)

    @torch.inference_mode()
    def translate_batch(self, texts: List[str], src: str, tgt: str) -> List[str]:
        if not texts:
            return []
        if src == tgt:
            return list(texts)

        direction = f"{src}->{tgt}"
        if direction not in self._models:
            raise ValueError(f"Unsupported direction: {direction}")
        tok = self._tokenizers[direction]
        mdl = self._models[direction]

        results: List[str] = [""] * len(texts)
        unique_to_indices: Dict[str, List[int]] = {}
        for i, t in enumerate(texts):
            if not isinstance(t, str) or not t.strip():
                results[i] = t
                continue
            unique_to_indices.setdefault(t, []).append(i)

        if not unique_to_indices:
            return results

        unique_texts = list(unique_to_indices.keys())
        batch = tok(unique_texts, return_tensors="pt", padding=True, truncation=True)
        batch = {k: v.to(self.device) for k, v in batch.items()}
        generated = mdl.generate(**batch, **GENERATION_KWARGS)
        decoded = tok.batch_decode(generated, skip_special_tokens=True)
        decoded = [localize_digits(t, tgt) for t in decoded]

        for text, translated in zip(unique_texts, decoded):
            for i in unique_to_indices[text]:
                results[i] = translated
        return results


def detect_language(*samples: str) -> str:
    for s in samples:
        if isinstance(s, str) and ARABIC_CHAR_RE.search(s):
            return "ar"
    return "en"


def get_nested(obj: Dict[str, Any], path: str) -> Any:
    cur: Any = obj
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def set_nested(obj: Dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    cur = obj
    for part in parts[:-1]:
        cur = cur[part]
    cur[parts[-1]] = value


def delete_nested(obj: Dict[str, Any], path: str) -> None:
    parts = path.split(".")
    cur = obj
    for part in parts[:-1]:
        cur = cur[part]
    cur.pop(parts[-1], None)


def _as_numeric_string(value: Any) -> Union[str, None]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        normalized = s.translate(AR_TO_EN_DIGITS)
        if re.fullmatch(r"-?\d+(\.\d+)?", normalized):
            return normalized
    return None


def convert_numeric(value: Any, tgt: str) -> Any:
    numeric_str = _as_numeric_string(value)
    if numeric_str is None:
        return None
    if tgt == "ar":
        return numeric_str.translate(EN_TO_AR_DIGITS)
    converted = numeric_str.translate(AR_TO_EN_DIGITS)
    try:
        return int(converted) if "." not in converted else float(converted)
    except ValueError:
        return converted
