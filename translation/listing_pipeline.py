"""
Listing-level translation pipeline.
"""

import copy
from typing import Any, Dict, List, Tuple

from inference_worker import InferenceWorker
from translator import (
    FIELDS_TO_TRANSLATE,
    convert_numeric,
    delete_nested,
    detect_language,
    get_nested,
    set_nested,
)


def _stash_pair(obj, path, original, translated, src_lang, tgt_lang):
    parts = path.split(".")
    leaf = parts[-1]
    src_path = ".".join(parts[:-1] + [f"{leaf}_{src_lang}"])
    tgt_path = ".".join(parts[:-1] + [f"{leaf}_{tgt_lang}"])
    set_nested(obj, src_path, original)
    if translated is not None:
        set_nested(obj, tgt_path, translated)
    delete_nested(obj, path)


def translate_listings(
    listings: List[Dict[str, Any]],
    worker: InferenceWorker,
    timeout: float = 60.0,
) -> List[Dict[str, Any]]:
    if not listings:
        return []

    planned: List[Dict[str, Any]] = []
    requests_by_dir: Dict[Tuple[str, str], List[Tuple[int, str, str]]] = {}

    for i, listing in enumerate(listings):
        result = copy.deepcopy(listing)
        src_lang = detect_language(result.get("title", ""), result.get("description", ""))
        tgt_lang = "ar" if src_lang == "en" else "en"

        for path in FIELDS_TO_TRANSLATE:
            original = get_nested(result, path)
            if original is None:
                continue

            numeric_converted = convert_numeric(original, tgt_lang)
            if numeric_converted is not None:
                _stash_pair(result, path, original, numeric_converted, src_lang, tgt_lang)
                continue

            if isinstance(original, str):
                _stash_pair(result, path, original, None, src_lang, tgt_lang)
                requests_by_dir.setdefault((src_lang, tgt_lang), []).append((i, path, original))

        result["_sourceLanguage"] = src_lang
        result["_targetLanguage"] = tgt_lang
        planned.append(result)

    for (src, tgt), entries in requests_by_dir.items():
        texts = [e[2] for e in entries]
        translations = worker.submit(texts, src, tgt, timeout=timeout)

        for (listing_idx, path, _original), translated in zip(entries, translations):
            parts = path.split(".")
            leaf = parts[-1]
            tgt_path = ".".join(parts[:-1] + [f"{leaf}_{tgt}"])
            set_nested(planned[listing_idx], tgt_path, translated)

    return planned
