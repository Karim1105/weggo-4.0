# LanceDB Listings API (FastAPI)

A production-ready FastAPI REST API that keeps a LanceDB vector + FTS index in sync with your listings database. Embeddings are delegated to your running LlamaIndex / llama.cpp server (Qwen3-Embedding).

---

## Quick start

```bash
pip install -r requirements.txt

# Development
uvicorn app:app --reload --host 0.0.0.0 --port 5000

# Production
gunicorn -c gunicorn.conf.py app:app
```

Interactive docs available at `http://100.78.155.72:5000/docs` (Swagger UI) and `/redoc`.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `LANCEDB_URI` | `semantic-lancedb-qwen3-emb` | Path / URI for LanceDB |
| `EMBED_API_BASE` | `http://0.0.0.0:8080/v1` | LlamaIndex embedding server base URL |
| `EMBED_MODEL_NAME` | `Qwen3-Embedding-0.6B-f8.gguf` | Model name passed to the server |
| `EMBED_QUERY_INSTRUCTION` | *(see app.py)* | Instruction prefix for query embedding |
| `EMBED_BATCH_SIZE` | `128` | Embedding batch size |
| `MAX_BATCH_SIZE` | `500` | Maximum listings per batch upsert |
| `HOST` | `0.0.0.0` | Bind host (dev server) |
| `PORT` | `5000` | Bind port (dev server) |

---

## API reference

All request/response bodies are JSON. Pydantic validates all inputs automatically.

### `GET /health`
Liveness / readiness probe.
```json
{ "status": "ok", "table": "listings", "row_count": 4200 }
```

---

### `POST /listings` — Upsert single listing

Insert or update one listing (keyed on `id`).

```json
{
  "id": "abc123",
  "title_en": "iPhone 15 Pro",
  "title_ar": "آيفون 15 برو",
  "description_en": "Brand new, sealed box",
  "description_ar": "جديد، صندوق مغلق",
  "brand_en": "Apple",  "brand_ar": "أبل",
  "category_en": "Electronics", "category_ar": "إلكترونيات",
  "subcategory_en": "Phones", "subcategory_ar": "هواتف",
  "condition_en": "New", "condition_ar": "جديد",
  "price_en": 4999, "price_ar": 4999,
  "sellerProfile": { "rating_en": 4.8, "rating_ar": 4.8 }
}
```

**Response `201`:**
```json
{ "upserted": ["abc123"] }
```

---

### `POST /listings/batch` — Upsert batch of listings

```json
{ "listings": [ { ...listing... }, { ...listing... } ] }
```

Safe for full re-syncs — existing ids updated, new ids inserted in one atomic call.
Maximum: `MAX_BATCH_SIZE` listings (default 500).

**Response `201`:**
```json
{ "upserted": ["id1", "id2", "id3"] }
```

---

### `PUT /listings/{id}` — Update existing listing

Update-only merge_insert: if the id does not exist, silent no-op (correct REST semantics).
The id in the URL is authoritative; any id in the body is overwritten.

**Response `200`:**
```json
{ "updated": "abc123" }
```

---

### `DELETE /listings/{id}` — Delete a listing

**Response `200`:**
```json
{ "deleted": "abc123" }
```

---

## Concurrency model

```
HTTP request (coroutine)
    │
    ▼
uvicorn event loop  ←─── serves hundreds of concurrent requests
    │
    ├─ await asyncio.Lock()          ← serialises all writers (async, non-blocking)
    │       │
    │       └─ await asyncio.to_thread(...)
    │                   │
    │                   └─ ThreadPoolExecutor
    │                           ├─ _build_arrow_table()   ← preprocessing (CPU)
    │                           ├─ embed_model.get_text_embedding_batch()  ← network I/O
    │                           ├─ table.merge_insert().execute()          ← file I/O
    │                           └─ table.optimize()                        ← file I/O
    │
    └─ GET /health (read, no lock) → asyncio.to_thread(count_rows)
```

**Key design decisions:**

- **`asyncio.Lock` not `threading.Lock`** — the lock is acquired with `async with`, so while one coroutine holds it waiting on the thread pool, the event loop is free to accept and process other incoming requests. A `threading.Lock` would block the entire event loop thread.

- **`asyncio.to_thread` for all blocking calls** — embedding, LanceDB writes, and `optimize()` are all synchronous. Running them directly in an `async` route would freeze the event loop. `to_thread` moves them to the shared `ThreadPoolExecutor`.

- **`asyncio.Lock` created in `lifespan`** — asyncio primitives must be created inside a running event loop. Creating them at module level (before uvicorn starts the loop) would attach them to the wrong loop and cause subtle bugs.

- **`workers = 1`** — LanceDB has no cross-process write coordination. The `asyncio.Lock` is process-local. Multiple workers would race at the filesystem level. One event loop handles hundreds of concurrent connections efficiently since the bottleneck is I/O, not CPU.

- **Indexes created once, `optimize()` after every write** — `create_fts_index` / `create_index` are expensive full rebuilds and run only on first table creation. All subsequent writes call `optimize()`, which incrementally compacts delta fragments and updates existing indexes.

- **Two text representations per listing:**
  - `text` → raw natural language → embedding model → `vector` column
  - `normalized_text` → stop-word removed + lemmatized → FTS/BM25 index

---

## Adding a search endpoint

```python
from lancedb.rerankers import RRFReranker

reranker = RRFReranker()

@app.post("/listings/search")
async def search_listings(request: Request, body: dict):
    query = body.get("query", "")
    limit = int(body.get("limit", 10))
    lang  = detect_language(query)

    # FTS: preprocess the same way the index was built
    q_fts = clean_text_for_lexical(query, lang)

    # Vector: embed raw query — model needs natural language
    mgr   = get_manager(request)
    q_vec = await asyncio.to_thread(
        mgr.embed_model.get_query_embedding, query
    )

    def _search():
        return (
            mgr._get_table()
            .search(query_type="hybrid")
            .vector(q_vec)
            .text(q_fts)
            .limit(limit)
            .rerank(reranker)
            .to_list()
        )

    results = await asyncio.to_thread(_search)
    return {"results": [r["id"] for r in results]}
```
