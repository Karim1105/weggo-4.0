"""
FastAPI — LanceDB Listing Management API
─────────────────────────────────────────────────────────────────────────────
Concurrency model
  • All async routes run on the uvicorn event loop (no thread blocking).
  • Embedding calls (sync, network I/O) and LanceDB writes (sync, file I/O)
    are offloaded to a shared ThreadPoolExecutor via asyncio.to_thread(),
    so the event loop is never stalled.
  • A single asyncio.Lock serialises all LanceDB writes; reads are lock-free.
  • One uvicorn worker process is sufficient — the lock is process-local and
    LanceDB has no cross-process write coordination.
"""

import asyncio
import logging
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from typing import Any

import lancedb
import nltk
import pyarrow as pa
from lancedb.rerankers import RRFReranker
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from langdetect import DetectorFactory, detect
from llama_index.embeddings.openai_like import OpenAILikeEmbedding
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from pydantic import BaseModel, field_validator, model_validator
from pyarabic.araby import strip_harakat, strip_tatweel, strip_tashkeel
from camel_tools.tokenizers.word import simple_word_tokenize
from camel_tools.disambig.mle import MLEDisambiguator

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# NLTK bootstrap (idempotent, runs once at import time)
# ---------------------------------------------------------------------------
for _pkg in ("punkt", "wordnet", "stopwords"):
    nltk.download(_pkg, quiet=True)

DetectorFactory.seed = 0

# ---------------------------------------------------------------------------
# Config (from environment variables with sensible defaults)
# ---------------------------------------------------------------------------
LANCEDB_URI            = os.getenv("LANCEDB_URI",        "semantic-lancedb-qwen3-emb")
EMBED_API_BASE         = os.getenv("EMBED_API_BASE",      "http://0.0.0.0:8080/v1")
EMBED_MODEL_NAME       = os.getenv("EMBED_MODEL_NAME",    "dengcao/Qwen3-Embedding-0.6B:Q8_0")
EMBED_QUERY_INSTRUCTION = os.getenv(
    "EMBED_QUERY_INSTRUCTION",
    "Given a query, retrieve relevant passages that answer the query",
)
EMBED_BATCH_SIZE       = int(os.getenv("EMBED_BATCH_SIZE", "128"))
MAX_BATCH_SIZE         = int(os.getenv("MAX_BATCH_SIZE",   "128"))
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "").strip()

# ---------------------------------------------------------------------------
# Thread pool — shared by all async→sync offloads
# Sized to: number of CPU cores × 4 (I/O-bound work dominates)
# ---------------------------------------------------------------------------
_executor = ThreadPoolExecutor(max_workers=(os.cpu_count() or 4) * 4)

# ---------------------------------------------------------------------------
# Text preprocessors (CPU-bound, stateless after __init__)
# ---------------------------------------------------------------------------

class ArabicListingPreprocessor:
    def __init__(self) -> None:
        self.stop_words   = set(stopwords.words("arabic"))
        self.disambiguator = MLEDisambiguator.pretrained("calima-egy-r13")

    def clean_text(self, text: str) -> str:
        text = re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)
        text = re.sub(r"[إأآا]", "ا", text)
        text = re.sub(r"ى",      "ي", text)
        text = re.sub(r"ة",      "ه", text)
        text = strip_tashkeel(text)
        text = strip_tatweel(text)
        text = strip_harakat(text)
        return re.sub(r"\s+", " ", text).strip()

    def remove_stop_words(self, text: str) -> str:
        return " ".join(t for t in text.split() if t not in self.stop_words)

    def lemmatize_text(self, text: str) -> str:
        if not text.strip():
            return text
        tokens = simple_word_tokenize(text)
        if not tokens:
            return text
        disambiguated = self.disambiguator.disambiguate(tokens)
        lemmas = []
        for word in disambiguated:
            if word.analyses:
                lemma = word.analyses[0].analysis.get("lex", word.word).split("_")[0]
                lemmas.append(lemma)
            else:
                lemmas.append(word.word)
        return " ".join(lemmas)

    def normalize(self, text: str) -> str:
        cleaned    = self.clean_text(text)
        lemmatized = self.lemmatize_text(cleaned)
        lemmatized = self.clean_text(lemmatized)
        return self.remove_stop_words(lemmatized)


class EnglishListingPreprocessor:
    def __init__(self) -> None:
        self.stop_words = set(stopwords.words("english"))
        self.lemmatizer = WordNetLemmatizer()

    def clean_text(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)
        return re.sub(r"\s+", " ", text).strip()

    def remove_stop_words(self, text: str) -> str:
        return " ".join(t for t in text.split() if t not in self.stop_words)

    def lemmatize_text(self, text: str) -> str:
        return " ".join(self.lemmatizer.lemmatize(t) for t in text.split())


# Singletons — initialised once at module load
_arabic_preprocessor  = ArabicListingPreprocessor()
_english_preprocessor = EnglishListingPreprocessor()

# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------

def detect_language(text: str) -> str:
    try:
        return "ar" if detect(text) == "ar" else "en"
    except Exception:
        return "en"


def clean_text_for_lexical(text: str, lang: str = "en") -> str:
    if lang == "ar":
        return _arabic_preprocessor.normalize(text)
    cleaned = _english_preprocessor.clean_text(text)
    cleaned = _english_preprocessor.remove_stop_words(cleaned)
    return _english_preprocessor.lemmatize_text(cleaned)


def _build_raw_text(item: dict) -> str:
    """
    Natural-language text for the embedding model.
    No preprocessing — the model needs fluent text for meaningful vectors.
    """
    en = (
        f"title: {item.get('title_en', '')}\n"
        f"title: {item.get('title_en', '')}\n"
        f"description: {item.get('description_en', '')}\n"
        f"brand: {item.get('brand_en', '')}\n"
        f"category: {item.get('category_en', '')}\n"
        f"subcategory: {item.get('subcategory_en', '')}\n"
        f"condition: {item.get('condition_en', '')}\n"
        f"price: {item.get('price_en', '')}\n"
        f"seller rating: {item.get('sellerProfile', {}).get('rating_en', '')}"
    )
    ar = (
        f"عنوان: {item.get('title_ar', '')}\n"
        f"عنوان: {item.get('title_ar', '')}\n"
        f"وصف: {item.get('description_ar', '')}\n"
        f"ماركة: {item.get('brand_ar', '')}\n"
        f"فئة: {item.get('category_ar', '')}\n"
        f"فئة فرعية: {item.get('subcategory_ar', '')}\n"
        f"حالة: {item.get('condition_ar', '')}\n"
        f"سعر: {item.get('price_ar', '')}\n"
        f"تقييم البائع: {item.get('sellerProfile', {}).get('rating_ar', '')}"
    )
    return f"{en}\n\n{ar}"


def _build_normalized_text(item: dict) -> str:
    """
    Lexically preprocessed text for FTS/BM25.
    Stop-word removal + lemmatization so keyword search matches canonical forms.
    """
    en = (
        f"title_en: {item.get('title_en', '')}\n"
        f"title_en: {item.get('title_en', '')}\n"
        f"description_en: {item.get('description_en', '')}\n"
        f"brand_en: {item.get('brand_en', '')}\n"
        f"category_en: {item.get('category_en', '')}\n"
        f"subcategory_en: {item.get('subcategory_en', '')}\n"
        f"condition_en: {item.get('condition_en', '')}\n"
        f"price_en: {item.get('price_en', '')}\n"
        f"seller rating_en: {item.get('sellerProfile', {}).get('rating_en', '')}"
    )
    ar = (
        f"title_ar: {item.get('title_ar', '')}\n"
        f"title_ar: {item.get('title_ar', '')}\n"
        f"description_ar: {item.get('description_ar', '')}\n"
        f"brand_ar: {item.get('brand_ar', '')}\n"
        f"category_ar: {item.get('category_ar', '')}\n"
        f"subcategory_ar: {item.get('subcategory_ar', '')}\n"
        f"condition_ar: {item.get('condition_ar', '')}\n"
        f"price_ar: {item.get('price_ar', '')}\n"
        f"seller rating_ar: {item.get('sellerProfile', {}).get('rating_ar', '')}"
    )
    return f"{clean_text_for_lexical(en, 'en')}\n\n{clean_text_for_lexical(ar, 'ar')}"


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------

class SellerProfile(BaseModel):
    rating_en: float | None = None
    rating_ar: float | None = None
    model_config = {"extra": "allow"}


class ListingModel(BaseModel):
    id:             str
    title_en:       str         = ""
    title_ar:       str         = ""
    description_en: str         = ""
    description_ar: str         = ""
    brand_en:       str         = ""
    brand_ar:       str         = ""
    category_en:    str         = ""
    category_ar:    str         = ""
    subcategory_en: str         = ""
    subcategory_ar: str         = ""
    condition_en:   str         = ""
    condition_ar:   str         = ""
    price_en:       float | None = None
    price_ar:       float | None = None
    sellerProfile:  SellerProfile = SellerProfile()
    model_config = {"extra": "allow"}

    def to_dict(self) -> dict:
        return self.model_dump()


class BatchUpsertRequest(BaseModel):
    listings: list[ListingModel]

    @field_validator("listings")
    @classmethod
    def must_be_non_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("'listings' must be a non-empty array.")
        if len(v) > MAX_BATCH_SIZE:
            raise ValueError(f"Batch size exceeds maximum of {MAX_BATCH_SIZE}.")
        return v


class SearchRequest(BaseModel):
    query: str
    locale: str = "en"
    filters: dict[str, Any] | None = None
    limit: int = 10

    @model_validator(mode="after")
    def validate_fields(self):
        self.query = self.query.strip()
        if not self.query:
            raise ValueError("'query' must not be empty.")
        if self.locale not in ("en", "ar"):
            raise ValueError("'locale' must be either 'en' or 'ar'.")
        self.limit = max(1, min(self.limit, 50))
        return self


class ExistsRequest(BaseModel):
    ids: list[str]

    @field_validator("ids")
    @classmethod
    def validate_ids(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("'ids' must be a non-empty array.")
        return v


# ---------------------------------------------------------------------------
# LanceDB manager
# ---------------------------------------------------------------------------

class LanceDBManager:
    """
    All public methods are synchronous (called via asyncio.to_thread from routes).
    A single asyncio.Lock (set during lifespan) serialises writes; reads are free.
    """

    def __init__(self, uri: str, embed_model: OpenAILikeEmbedding) -> None:
        self.db          = lancedb.connect(uri)
        self.embed_model = embed_model
        self._table_name = "listings"
        self._table      = None
        self._write_lock: asyncio.Lock | None = None   # assigned in lifespan
        self._ensure_table()

    def set_lock(self, lock: asyncio.Lock) -> None:
        """Inject the event-loop-bound asyncio.Lock created during lifespan."""
        self._write_lock = lock

    # ------------------------------------------------------------------
    # Internal helpers (sync — run inside thread pool)
    # ------------------------------------------------------------------

    def _ensure_table(self) -> None:
        try:
            self._table = self.db.open_table(self._table_name)
            logger.info("Opened existing LanceDB table '%s'.", self._table_name)
        except Exception:
            logger.info("Table '%s' not found — will be created on first upsert.", self._table_name)

    def _get_table(self):
        if self._table is None:
            raise RuntimeError("Table does not exist yet. Insert at least one listing first.")
        return self._table

    def _embed(self, texts: list[str]) -> list[list[float]]:
        """Blocking embedding call — always run inside thread pool, never in event loop."""
        return self.embed_model.get_text_embedding_batch(texts, show_progress=False)

    def _build_arrow_table(self, items: list[dict]) -> pa.Table:
        """
        Build a PyArrow table from listing dicts.
          text            ← raw natural language  → embedding model → vector column
          normalized_text ← lexically preprocessed               → FTS index
        """
        raw_texts        = [_build_raw_text(item)        for item in items]
        normalized_texts = [_build_normalized_text(item) for item in items]
        embeddings       = self._embed(raw_texts)   # blocking network call

        return pa.table({
            "id":              [str(item["id"]) for item in items],
            "title_en":        [item.get("title_en", "") for item in items],
            "title_ar":        [item.get("title_ar", "") for item in items],
            "description_en":  [item.get("description_en", "") for item in items],
            "description_ar":  [item.get("description_ar", "") for item in items],
            "brand_en":        [item.get("brand_en", "") for item in items],
            "brand_ar":        [item.get("brand_ar", "") for item in items],
            "category_en":     [item.get("category_en", "") for item in items],
            "category_ar":     [item.get("category_ar", "") for item in items],
            "subcategory_en":  [item.get("subcategory_en", "") for item in items],
            "subcategory_ar":  [item.get("subcategory_ar", "") for item in items],
            "condition_en":    [item.get("condition_en", "") for item in items],
            "condition_ar":    [item.get("condition_ar", "") for item in items],
            "price_en":        [item.get("price_en") for item in items],
            "price_ar":        [item.get("price_ar") for item in items],
            "seller_rating_en": [item.get("sellerProfile", {}).get("rating_en") for item in items],
            "seller_rating_ar": [item.get("sellerProfile", {}).get("rating_ar") for item in items],
            "text":            raw_texts,
            "normalized_text": normalized_texts,
            "vector":          embeddings,
            "metadata":        [[{}] for _ in items],
        })

    def _create_indexes(self, table) -> None:
        """Build FTS + ANN indexes from scratch. Called once on table creation."""
        table.create_fts_index(
            "normalized_text",
            stem=False,
            language="English",
            replace=True,
            lower_case=False,
            remove_stop_words=False,
        )
        table.create_index(
            vector_column_name="vector",
            num_sub_vectors=256,
            num_partitions=2,
            metric="cosine",
        )
        logger.info("Indexes created on table '%s'.", self._table_name)

    def _optimize(self, table) -> None:
        """Incrementally compact fragments and update indexes. Called after every write."""
        table.optimize()
        logger.info("optimize() completed on table '%s'.", self._table_name)

    # ------------------------------------------------------------------
    # Public sync write methods (called via asyncio.to_thread)
    # ------------------------------------------------------------------

    def _do_upsert(self, items: list[dict]) -> dict:
        """
        Sync upsert — must be called inside the asyncio.Lock.
        Builds the Arrow table (including embeddings) then merge_inserts.
        """
        arrow_table = self._build_arrow_table(items)
        ids = arrow_table.column("id").to_pylist()

        if self._table is None:
            self._table = self.db.create_table(
                self._table_name, data=arrow_table, mode="overwrite"
            )
            self._create_indexes(self._table)
        else:
            (
                self._table.merge_insert("id")
                .when_matched_update_all()
                .when_not_matched_insert_all()
                .execute(arrow_table)
            )
            self._optimize(self._table)

        logger.info("Upserted %d listing(s): %s", len(ids), ids)
        return {"upserted": ids}

    def _do_update(self, listing_id: str, item: dict) -> dict:
        """
        Sync update-only — must be called inside the asyncio.Lock.
        when_matched_update_all only: no accidental insert on bad id.
        """
        item["id"] = listing_id
        arrow_table = self._build_arrow_table([item])
        tbl = self._get_table()
        (
            tbl.merge_insert("id")
            .when_matched_update_all()
            .execute(arrow_table)
        )
        self._optimize(tbl)
        logger.info("Updated listing %s.", listing_id)
        return {"updated": listing_id}

    def _do_delete(self, listing_id: str) -> dict:
        """Sync delete — must be called inside the asyncio.Lock."""
        tbl = self._get_table()
        tbl.delete(f"id = '{listing_id}'")
        self._optimize(tbl)
        logger.info("Deleted listing %s.", listing_id)
        return {"deleted": listing_id}

    def _do_health(self) -> dict:
        try:
            count = self._get_table().count_rows()
            return {"status": "ok", "table": self._table_name, "row_count": count}
        except RuntimeError:
            return {"status": "ok", "table": self._table_name, "row_count": 0,
                    "note": "table not yet created"}

    def _build_search_filter(self, locale: str, filters: dict[str, Any] | None) -> str | None:
        if not filters:
            return None

        clauses: list[str] = []
        category = (filters.get("category") or "").strip()
        condition = (filters.get("condition") or "").strip()
        min_price = filters.get("minPrice")
        max_price = filters.get("maxPrice")

        if category:
            column = f"category_{locale}"
            safe_category = category.replace("'", "\\'")
            clauses.append(f"{column} = '{safe_category}'")
        if condition:
            column = f"condition_{locale}"
            safe_condition = condition.replace("'", "\\'")
            clauses.append(f"{column} = '{safe_condition}'")
        if isinstance(min_price, (int, float)):
            clauses.append(f"price_en >= {float(min_price)}")
        if isinstance(max_price, (int, float)):
            clauses.append(f"price_en <= {float(max_price)}")

        if not clauses:
            return None

        return " AND ".join(clauses)

    def _do_search(self, body: SearchRequest) -> dict:
        tbl = self._get_table()
        reranker = RRFReranker()
        query_lang = detect_language(body.query)
        q_fts = clean_text_for_lexical(body.query, query_lang)
        q_vec = self.embed_model.get_query_embedding(body.query)
        search = (
            tbl.search(query_type="hybrid")
            .vector(q_vec)
            .text(q_fts)
            .limit(body.limit)
            .rerank(reranker)
        )

        where = self._build_search_filter(body.locale, body.filters)
        if where:
            search = search.where(where)

        results = search.to_list()
        return {"results": [row["id"] for row in results]}

    def _do_exists(self, body: ExistsRequest) -> dict:
        tbl = self._get_table()
        safe_ids = [listing_id.replace("'", "\\'") for listing_id in body.ids]
        quoted_ids = ",".join(f"'{listing_id}'" for listing_id in safe_ids)
        results = tbl.search().where(f"id IN ({quoted_ids})").limit(len(body.ids)).to_list()
        return {"existing_ids": [row["id"] for row in results]}


# ---------------------------------------------------------------------------
# Async wrappers — hold the write lock, offload blocking work to thread pool
# ---------------------------------------------------------------------------

async def _locked_write(manager: LanceDBManager, fn, *args):
    """
    Generic async write wrapper:
      1. Acquire the asyncio write lock   (serialises all writers)
      2. Run the blocking sync function   in the thread pool (event loop stays free)
      3. Release the lock automatically

    The embedding call and LanceDB write both happen inside the thread pool,
    so the event loop can serve other requests while they're running.
    """
    async with manager._write_lock:
        return await asyncio.to_thread(fn, *args)


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Build all singletons once at startup.
    asyncio.Lock must be created inside the running event loop — that's why
    it's built here rather than in LanceDBManager.__init__.
    """
    logger.info("Starting up — initialising embed model and LanceDB manager.")

    embed_model = OpenAILikeEmbedding(
        model_name=EMBED_MODEL_NAME,
        api_base=EMBED_API_BASE,
        api_key="fake",
        query_instruction=EMBED_QUERY_INSTRUCTION,
        embed_batch_size=EMBED_BATCH_SIZE,
    )

    manager = LanceDBManager(uri=LANCEDB_URI, embed_model=embed_model)
    manager.set_lock(asyncio.Lock())   # created inside the event loop ✓

    app.state.manager = manager

    yield   # ← server runs here

    logger.info("Shutting down — draining thread pool.")
    _executor.shutdown(wait=True)


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Listings Vector Index API",
    description="Manages LanceDB vector + FTS index for bilingual (EN/AR) listings.",
    version="2.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def enforce_internal_auth(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)

    if INTERNAL_SERVICE_TOKEN:
        token = request.headers.get("X-Internal-Auth", "")
        if token != INTERNAL_SERVICE_TOKEN:
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"error": "Unauthorized"})

    return await call_next(request)


def get_manager(request: Request) -> LanceDBManager:
    return request.app.state.manager


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST,
                        content={"error": str(exc)})

@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    return JSONResponse(status_code=status.HTTP_409_CONFLICT,
                        content={"error": str(exc)})

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url)
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        content={"error": "Internal server error", "detail": str(exc)})


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", summary="Liveness / readiness probe")
async def health(request: Request):
    mgr = get_manager(request)
    # Health check is a fast read — no lock needed, but still offload to thread
    # pool because count_rows() is a sync call.
    result = await asyncio.to_thread(mgr._do_health)
    return result


@app.post("/listings", status_code=status.HTTP_201_CREATED,
          summary="Upsert a single listing")
async def upsert_listing(listing: ListingModel, request: Request):
    """
    Insert or update a single listing (keyed on `id`).
    If the id already exists the row is updated; otherwise it is inserted.
    """
    mgr = get_manager(request)
    return await _locked_write(mgr, mgr._do_upsert, [listing.to_dict()])


@app.post("/listings/batch", status_code=status.HTTP_201_CREATED,
          summary="Upsert a batch of listings")
async def upsert_listings_batch(body: BatchUpsertRequest, request: Request):
    """
    Upsert up to MAX_BATCH_SIZE listings in one atomic merge_insert call.
    Safe to use for full re-syncs — existing ids are updated, new ids inserted.
    """
    mgr   = get_manager(request)
    items = [l.to_dict() for l in body.listings]
    return await _locked_write(mgr, mgr._do_upsert, items)


@app.put("/listings/{listing_id}", status_code=status.HTTP_200_OK,
         summary="Update an existing listing")
async def update_listing(listing_id: str, listing: ListingModel, request: Request):
    """
    Update a listing by id. The id in the URL is authoritative.
    If the id does not exist this is a silent no-op (correct REST update semantics).
    """
    mgr  = get_manager(request)
    item = listing.to_dict()
    return await _locked_write(mgr, mgr._do_update, listing_id, item)


@app.delete("/listings/{listing_id}", status_code=status.HTTP_200_OK,
            summary="Delete a listing")
async def delete_listing(listing_id: str, request: Request):
    mgr = get_manager(request)
    return await _locked_write(mgr, mgr._do_delete, listing_id)


@app.post("/listings/search", status_code=status.HTTP_200_OK,
          summary="Hybrid search over indexed listings")
async def search_listings(body: SearchRequest, request: Request):
    mgr = get_manager(request)
    return await asyncio.to_thread(mgr._do_search, body)


@app.post("/listings/exists", status_code=status.HTTP_200_OK,
          summary="Check which listing ids exist in the index")
async def check_listing_exists(body: ExistsRequest, request: Request):
    mgr = get_manager(request)
    return await asyncio.to_thread(mgr._do_exists, body)


# ---------------------------------------------------------------------------
# Dev entry-point  (use uvicorn directly in production — see README)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "5000")),
        reload=os.getenv("UVICORN_RELOAD", "false").lower() == "true",
        log_level="info",
    )
