# Integration Plan: Chatbot, LanceDB, Translation Services

**Author:** Claude (Opus 4.7), acting as senior engineer reviewing the codebase
**Scope:** Wire the three Python services in [chatbot/](../chatbot/), [lancedb/](../lancedb/), and [translation/](../translation/) into the Next.js app at production quality.
**Optimisation axis:** p99 latency on user-facing reads, write-path resilience, and end-to-end correctness between MongoDB and LanceDB.

---

## 0. TL;DR — what we are actually building

Three Python services, each with very different latency and consistency profiles:

| Service | Port | Role | Latency budget | Consistency |
|---|---|---|---|---|
| `chatbot` | 5050 | Conversational + hybrid search | p95 ≤ 1.5s, p99 ≤ 4s | Session-scoped, eventual |
| `lancedb` | 5000 | Vector + BM25 index of listings | Writes async, reads p95 ≤ 250ms | Eventually consistent with Mongo |
| `translation` | 8000 | EN↔AR MarianMT inference | Single-GPU, batched, p95 ≤ 2s | Write-once, idempotent |

The mistake to avoid is treating these as three independent HTTP endpoints and calling them inline from request handlers. They have shared failure modes (GPU contention, single-worker write locks, model-load latency) and we must design a coordination layer between Next.js and them — not just three more `fetch()` calls.

The integration breaks cleanly into **two distinct surfaces**:

1. **Read surface** — chatbot + lancedb search → live in the request path. Must be fast, deduplicated, and degrade gracefully.
2. **Write surface** — translation + lancedb upsert → fired from listing CRUD. Must be durable (outbox), idempotent, and never block the user response.

These are designed independently and only meet again at the `lib/services/` boundary.

---

## 1. Current state — what already exists, what is missing

What is already wired (partial):
- [lib/chatbot-service.ts](../lib/chatbot-service.ts) — thin `fetch` proxy to chatbot
- [lib/chatbot-client.ts](../lib/chatbot-client.ts) — reply parser for structured search results
- [app/api/chat/route.ts](../app/api/chat/route.ts) — direct proxy
- [app/api/ai-chat/route.ts](../app/api/ai-chat/route.ts) — proxy *with* a Mongo-query fallback when `CHATBOT_API_URL` is unset
- `CHATBOT_API_URL` env var in [.env.example](../.env.example)

What is missing — the bulk of the work:
- ❌ **LanceDB sync.** No code writes to the lancedb service when listings are created, updated, or deleted. The vector index will be stale or empty.
- ❌ **Translation pipeline.** No code calls the translation service. Listings are stored in one language only.
- ❌ **Search endpoint backed by lancedb.** All "search" today goes through Mongo `aggregate` in [lib/api/listings/](../lib/api/listings/).
- ❌ **Connection management.** Each request opens a new TCP/TLS handshake to Python — measurable overhead.
- ❌ **Failure isolation.** Python services down ⇒ Next.js routes hang or 502 noisily.
- ❌ **Anything resembling end-to-end correctness** between Mongo and the LanceDB index.

What must be deleted or rewritten:
- 🗑️ `MOCK_PRODUCTS` array and most of [lib/rag.ts](../lib/rag.ts) — 396 lines of hard-coded mocks. Replaced by a `lib/search/` client.
- 🗑️ The category-keyword `QUERY_CONFIG` fallback at the top of [app/api/ai-chat/route.ts](../app/api/ai-chat/route.ts#L13-L38). The whole point of the chatbot service is that we don't need brittle keyword routers.

---

## 2. Architectural principles (the non-negotiables)

These constrain every design choice that follows. State them up front so the trade-offs are visible.

**P1. The user's listing-create response must not depend on Python.**
A new listing is durable as soon as Mongo commits. Translation and indexing happen *afterwards* via a transactional outbox. The user sees their listing immediately; AR translations and search indexing converge within seconds.

**P2. Read-path Python calls run behind a circuit breaker.**
Chatbot and lancedb-search are user-blocking. If they degrade, we fail fast (≤200ms) and fall back to a Mongo-only browse path — not hang the page.

**P3. Mongo is the source of truth. LanceDB is a derived projection.**
Any inconsistency is resolved by *rebuilding LanceDB from Mongo*, never the reverse. This drives our reconciliation strategy in §6.

**P4. HTTP to Python is pooled and persistent.**
Stop opening a fresh connection per call. Use `undici.Agent` with keep-alive — ~30–80ms saved per call on a same-host service.

**P5. Translation is write-time, not read-time.**
Translating on every read is wasted GPU. Translate once at write, materialize both `*_en` and `*_ar` columns into Mongo and into LanceDB. Read paths just pick the right column from the user's locale.

**P6. No silent fallbacks.**
Every fallback path (Mongo-only browse, untranslated listing, stale index) must emit a structured log + metric. Silent degradation is how production rots.

**P7. The browser never talks to the Python services directly.**
All three Python services (`chatbot:5050`, `lancedb:5000`, `translation:8000`) are **backend-only**. Every browser-originated call goes through a Next.js route handler under `app/api/*`, which is the only thing allowed to open a socket to Python. This is a hard rule, enforced at the network layer — not just a convention.

Why this matters (and is non-negotiable):

- **No auth on the Python side.** None of the three services ship authentication. Exposing them to the public internet means anyone can drain GPU on the translation service, poison the LanceDB index, or scrape full chat history out of MongoDB by guessing session ids.
- **Trust boundary lives at Next.js.** User identity, rate limits, CSRF protection, input validation, and audit logging all live in Next.js route handlers ([lib/auth.ts](../lib/auth.ts), [lib/rateLimit.ts](../lib/rateLimit.ts), [lib/csrf.ts](../lib/csrf.ts)). The Python services *assume* their caller is already authenticated and rate-limited. Bypassing Next.js bypasses all of it.
- **Schema enforcement.** Python services accept any `session_id` string. A malicious client could pass another user's session id and read their conversation. Next.js must derive `session_id` from the authenticated user (`session_id = sha256(userId + saltedSecret)`), never accept it from the request body.
- **Egress vs ingress are different problems.** Next.js → Python is a controlled outbound call with our own retries, breakers, and timeouts. Browser → Python is uncontrolled inbound traffic on a service designed for trusted callers.

How it's enforced — defence in depth, four layers:

1. **Network isolation (primary control).** Python services bind to a private interface only. In production:
   - Bind to `127.0.0.1` (same host as Next.js) or a private VPC subnet, never `0.0.0.0` on a public IP.
   - The current `EMBED_API_BASE=http://0.0.0.0:8080/v1` and similar entries in [.env.example](../.env.example) are **dangerous defaults** — `0.0.0.0` means "listen on every interface." Fix to `127.0.0.1` for single-host, or a private DNS name (e.g. `chatbot.internal`) for multi-host. Firewall rule blocks public ingress to ports 5000/5050/8000.
   - Docker compose: put Python services on an internal network with no published ports; only Next.js gets `ports:` mapped to the host.

2. **Environment variable hygiene.** Python service URLs live in **server-only** env vars. Never use the `NEXT_PUBLIC_` prefix for `CHATBOT_API_URL`, `LANCEDB_API_URL`, or `TRANSLATION_API_URL`. If a Python URL ever appears in a bundle, that's a build-time failure — add a check in CI:
   ```bash
   grep -rE "(CHATBOT|LANCEDB|TRANSLATION)_API_URL" .next/static/ && exit 1
   ```

3. **Code-level guard.** The shared http-client (§3.1) explicitly refuses to run in a browser context:
   ```ts
   // lib/services/http-client.ts (top of file)
   if (typeof window !== 'undefined') {
     throw new Error('Service clients are server-only. Call via /api/* route.')
   }
   ```
   Any accidental import into a client component fails immediately at module-load with a clear message — not silently at runtime when a user is in the middle of a flow.

4. **Optional shared secret (belt-and-braces).** Add `X-Internal-Auth: ${INTERNAL_SERVICE_TOKEN}` on every Next.js → Python call; Python services reject any request missing it. Cheap to add (a few lines per `app.py`), and means that even if network isolation is misconfigured one day, the services aren't immediately wide open. Token rotated via env var; never logged.

Consequence for the architecture: **every Python endpoint has exactly one caller — a Next.js route handler.** No exceptions, no "just for testing in prod," no admin tools that talk to Python directly from a laptop (use `kubectl port-forward` / SSH tunnel instead).

---

## 3. The shared infrastructure layer (build this first)

Before touching any of the three integrations, add `lib/services/` — the substrate they all sit on. This is the highest-leverage code in the whole plan; skipping it leads to copy-pasted retry logic across three clients.

### 3.1 [lib/services/http-client.ts](../lib/services/http-client.ts) — pooled HTTP

```ts
import { Agent, request } from 'undici'

const agent = new Agent({
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 60_000,
  connections: 64,          // per-origin pool size
  pipelining: 1,            // FastAPI/uvicorn doesn't pipeline; keep 1
  headersTimeout: 5_000,
  bodyTimeout: 30_000,
})

export type CallOpts = {
  timeoutMs: number
  retries?: number          // only for idempotent calls
  signal?: AbortSignal
}

export async function callJson<T>(
  url: string,
  body: unknown,
  opts: CallOpts,
): Promise<T> { /* ... */ }
```

**Why undici over `fetch`:** explicit pool sizing, per-host keep-alive, and we can attach a circuit breaker around `agent.dispatch`. Native `fetch` in Node uses undici internally but exposes no agent controls.

### 3.2 [lib/services/circuit-breaker.ts](../lib/services/circuit-breaker.ts) — per-upstream breaker

A classic 3-state breaker (CLOSED → OPEN → HALF_OPEN) with these parameters:

| Param | Value | Rationale |
|---|---|---|
| `failureThreshold` | 5 failures in 10s rolling window | Tolerant of transient GPU stalls |
| `openDurationMs` | 15_000 | Long enough for a model to recover; short enough to retry |
| `halfOpenProbes` | 1 | Single-probe — Python services have global write locks; don't stampede |

One breaker instance per upstream (chatbot, lancedb, translation). When open, calls reject immediately with `ServiceUnavailableError` — handlers catch this and switch to degraded mode.

### 3.3 [lib/services/single-flight.ts](../lib/services/single-flight.ts) — request coalescing

Identical concurrent requests should hit Python *once*. This is huge for the chatbot — when a user double-clicks "send" or two tabs open the same search, we coalesce.

```ts
const inflight = new Map<string, Promise<unknown>>()

export async function singleflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined
  if (existing) return existing
  const p = fn().finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}
```

Key construction: `${userId}:${sha256(message)}` for chat, `${normalizedQuery}:${locale}:${limit}` for search. Don't coalesce per-IP — different users sending identical text is rare, and the privacy implications of cross-user reply sharing are nasty.

### 3.4 [lib/services/lru-cache.ts](../lib/services/lru-cache.ts) — bounded in-process L1

The existing [lib/cache.ts](../lib/cache.ts) uses `node-cache` which is fine for keyed TTL but has no LRU bound. For search-result caching we want fixed-memory bounds. Use `lru-cache@10`. **L1 only** — adding Redis is out of scope until proven necessary. A correctly-tuned LRU per Node process handles 10k+ entries with sub-microsecond reads.

Cache scopes:
- `search:${sha1(normalizedQuery+filters)}` → 60s TTL, max 5000 entries
- `embedding:${sha1(text)}` → 600s TTL, max 2000 entries (saves redundant calls to the embedding service)

Do **not** cache chat replies. Stateful per-session, low hit rate, and stale replies are worse than a slow one.

---

## 4. Track A — Chatbot integration (read path)

Goal: make [app/api/ai-chat/route.ts](../app/api/ai-chat/route.ts) reliable, fast, and free of the mock fallback.

### 4.1 Replace the dual-mode handler with a single clean pipeline

Today the route has two modes: chatbot if env set, else Mongo keyword matcher. This is testing surface ×2 and the fallback is a worse product. New pipeline:

```
POST /api/ai-chat
  ├─ rateLimit(user, 10/min)                      [already exists]
  ├─ singleflight(`chat:${userId}:${sha1(msg)}`)
  ├─ breaker.run(() => chatbotClient.send(...))   timeout 8s
  │     ├─ on OPEN/timeout → degraded: { reply: "...", degraded: true }
  │     └─ on success      → parse structured reply (existing chatbot-client.ts)
  └─ stream response (SSE) ────────────────────────► client
```

### 4.2 Switch the wire format to Server-Sent Events

The chatbot's `/chat` endpoint currently returns the full reply at once. Two upgrades:

1. **Streaming on the chatbot side** — modify [chatbot/app.py](../chatbot/app.py) to yield tokens via FastAPI `StreamingResponse`. LlamaIndex `ChatEngine` exposes `astream_chat()`. This is a ~30-line Python change but transforms perceived latency.
2. **SSE proxy in Next.js** — `app/api/ai-chat/route.ts` returns a `ReadableStream`. First-byte-to-user drops from ~1.2s to ~150ms.

If you're not ready to stream yet, skip this and keep the JSON response — but it's the single biggest perceived-perf win.

### 4.3 Session handling — server-derived, never client-supplied

Today the client sends `session_id`. The chatbot service stores history in MongoDB with TTL `SESSION_TTL_SECS=180`. Three concerns:

- **Trust boundary (per P7).** A client-supplied `session_id` is a chat-history-takeover vulnerability — passing another user's id reads their conversation. The Next.js route handler must **derive** the session id server-side: `session_id = hmac_sha256(INTERNAL_SECRET, userId || anonymousCookieId)`. The browser sends *no* session id. `createChatSessionId()` in [lib/chatbot-client.ts](../lib/chatbot-client.ts#L14) and its UUID-in-`localStorage` design get deleted.
- **180s is too short for an interactive chat.** Bump to 1800s (30 min) — match a typical browse session.
- **Anonymous users** get a signed HTTP-only cookie (`anon_chat_id`, 30-day expiry) that Next.js mints on first chat call. The browser still never sees the chatbot session id.

### 4.4 Files changed

- ✏️ [app/api/ai-chat/route.ts](../app/api/ai-chat/route.ts) — delete keyword fallback (lines 13–78), add SSE
- ✏️ [lib/chatbot-service.ts](../lib/chatbot-service.ts) — route through `lib/services/http-client.ts` + breaker
- ✏️ [components/AIChatbot.tsx](../components/AIChatbot.tsx) — consume SSE stream, persist sessionId
- ✏️ [chatbot/app.py](../chatbot/app.py) — `StreamingResponse` over `astream_chat()`
- 🗑️ [lib/rag.ts](../lib/rag.ts) — delete `MOCK_PRODUCTS`, the route never falls back to mock data again

---

## 5. Track B — LanceDB integration (write path + search read path)

This is the largest piece of work. Two halves: (a) keep the index in sync with Mongo, (b) expose a hybrid-search endpoint.

### 5.1 The synchronization problem — why a transactional outbox

Naïve approach: in `createListingService`, after `Product.create()`, call `lancedb.POST /listings`. **Don't do this.** Three failure modes:

| Failure | Consequence of naïve approach |
|---|---|
| LanceDB down during create | User sees create fail (or we silently lose the index update) |
| Process crashes between Mongo write and HTTP call | Index permanently misses this listing |
| Update succeeds in Mongo but HTTP returns 5xx | We retry — but how do we know on next request whether the previous write made it? |

The standard solution is the **transactional outbox pattern**: write the listing *and* an "intent to sync" record in a single Mongo transaction. A separate worker drains the outbox and calls LanceDB. If the worker crashes, restart picks up where it left off. If LanceDB is down, the outbox grows; when it comes back, we drain.

### 5.2 Outbox schema

New collection `listing_sync_outbox`:

```ts
{
  _id: ObjectId,
  productId: ObjectId,             // FK → products._id
  op: 'upsert' | 'delete',
  attempts: number,                // for exponential backoff
  nextAttemptAt: Date,             // index this
  lastError?: string,
  createdAt: Date,
  payloadHash: string,             // sha1 of canonical payload — see §5.4 for why
}
```

Index: `{ nextAttemptAt: 1 }` partial on `attempts < 10`. Drained items are **deleted**, not soft-marked — keeps the collection small.

### 5.3 Write path (creating/updating a listing)

```ts
// lib/api/listings/service.ts — modified
await mongoose.connection.transaction(async (session) => {
  const product = await Product.create([{...}], { session })
  await SyncOutbox.create([{
    productId: product[0]._id,
    op: 'upsert',
    attempts: 0,
    nextAttemptAt: new Date(),
    payloadHash: hashListingPayload(product[0]),
  }], { session })
})
// Respond to user immediately. Worker picks up the outbox row.
```

Note: requires a Mongo **replica set** for transactions. If we're still on standalone Mongo, fall back to the *two-phase* variant: write the outbox row first with `state: 'pending'`, then write product, then mark outbox `state: 'ready'`. Worker only drains `ready` rows. Recovery: pending rows older than 60s with no corresponding product get reaped.

### 5.4 The sync worker

A dedicated Node process (or — to start — a per-instance background task inside Next.js itself, gated by leader election via a Mongo `findOneAndUpdate` lease lock).

```ts
// lib/workers/lancedb-sync.ts
async function tick() {
  const lease = await acquireLease('lancedb-sync', { ttlMs: 30_000 })
  if (!lease) return

  const batch = await SyncOutbox.find({ nextAttemptAt: { $lte: new Date() } })
    .sort({ nextAttemptAt: 1 })
    .limit(50)   // matches lancedb's MAX_BATCH_SIZE / 10 — leave headroom

  // Group: upserts together, deletes individually (lancedb has no batch delete)
  const upserts = batch.filter(o => o.op === 'upsert')
  const deletes = batch.filter(o => o.op === 'delete')

  if (upserts.length) {
    const products = await Product.find({ _id: { $in: upserts.map(o => o.productId) } })
    const translated = await ensureTranslated(products)   // §6
    const payload = translated.map(toLanceDbShape)
    await lancedbClient.upsertBatch(payload)
    await SyncOutbox.deleteMany({ _id: { $in: upserts.map(o => o._id) } })
  }

  for (const d of deletes) {
    await lancedbClient.delete(d.productId.toString())
    await SyncOutbox.deleteOne({ _id: d._id })
  }
}
```

**Backoff on failure:** `nextAttemptAt = now + min(2^attempts, 600) * 1000ms`, capped at 10 attempts then alert.

**`payloadHash` is for idempotency:** before upserting, compare hash with the previously-synced hash (stored in a separate `listing_sync_state` collection or as a field on `Product`). If unchanged, drop the outbox row without calling LanceDB. This catches benign re-syncs (e.g. a view count update) that don't need re-embedding — and embedding is the expensive step.

### 5.5 Reconciliation job — the safety net

Outbox covers *future* writes. It does not catch:
- LanceDB data deleted by an operator
- Bugs that dropped outbox rows
- Drift accumulated before the outbox was deployed

Add a nightly reconciliation:

```
For each batch of 1000 productIds from Mongo (sorted by _id, cursor):
  - Fetch corresponding rows from LanceDB (the lancedb service needs a new
    POST /listings/exists endpoint that takes a list of ids)
  - For each missing or hash-mismatched id, enqueue an outbox upsert
For each id in LanceDB not in Mongo: enqueue an outbox delete
```

Runs at 03:00 local. Logs row-count and divergence-count. Alert if divergence > 1% of catalog.

### 5.6 Search read path — proxy hybrid search to LanceDB

The lancedb service's README sketches a `/listings/search` endpoint at the bottom — **build that endpoint**, then add a Next.js client.

LanceDB's hybrid search (vector + BM25 with RRF reranker) is dramatically better than Mongo `$text` for marketplace queries with synonyms, brand variants, and bilingual queries. This is the whole reason the service exists.

```ts
// lib/search/lancedb-client.ts
export async function hybridSearch(opts: {
  query: string
  locale: 'en' | 'ar'
  filters?: { category?: string; minPrice?: number; maxPrice?: number }
  limit?: number
}): Promise<string[]> {           // returns productIds only
  const key = `search:${sha1(JSON.stringify(opts))}`
  return singleflight(key, () =>
    lruCache.getOrCompute(key, 60_000, () =>
      breaker.run(() => httpClient.callJson('/listings/search', opts, { timeoutMs: 2000 }))
    )
  )
}
```

The client returns **only ids**, then we hydrate from Mongo. This keeps LanceDB's row payload small (just what's needed for indexing) and avoids duplicating the listing schema across two stores. Cost: one extra Mongo `find({_id:{$in:ids}})` — cheap on the indexed primary key.

### 5.7 Files

- ➕ [lib/services/](../lib/services/) — http-client, breaker, single-flight, lru-cache
- ➕ `lib/search/lancedb-client.ts`
- ➕ `lib/workers/lancedb-sync.ts`
- ➕ `lib/workers/lancedb-reconcile.ts`
- ➕ `models/SyncOutbox.ts`
- ✏️ [lib/api/listings/service.ts](../lib/api/listings/service.ts) — wrap create in transaction + outbox insert
- ✏️ [lancedb/app.py](../lancedb/app.py) — add `/listings/search` and `/listings/exists` endpoints
- ➕ `app/api/listings/search/route.ts` — proxies to `lib/search/lancedb-client.ts`

---

## 6. Track C — Translation integration (write path enrichment)

Goal: every listing has `*_en` and `*_ar` fields in both Mongo and LanceDB, populated at write time.

### 6.1 Where translation slots in

Translation runs *inside* the sync worker, between fetching Mongo rows and posting to LanceDB. Why there and not in the request path:

- Listing creation must not block on a single-GPU service that can stall under load
- Translations are deterministic — same input → same output → cache forever
- Both downstreams (Mongo backfill, LanceDB index) need the same translated output, so do it once

### 6.2 The pipeline

```
ensureTranslated(products) →
  for each product:
    1. compute payloadHash → look up translation cache
       (new collection `translation_cache`, keyed by sha1 of source text + direction)
    2. cache hit → use cached translation
    3. cache miss → batch into a single call to translation service:
         POST /translate/listings  body: [...]
       (the service already batches up to 50 per call internally per its README)
    4. write translations back to Mongo product doc (title_en, title_ar, ...)
       AND populate translation_cache with new entries
```

### 6.3 Why a translation cache table

Two reasons:

1. **Idempotency on retries.** If LanceDB upsert fails after translation succeeded, we should not re-translate on retry — that's a wasted GPU call.
2. **Cross-listing dedup.** Marketplace text is repetitive ("Like New", "Cairo, Maadi", "Excellent condition"). Hit rate in cache is realistically 30–60% for short fields.

Schema:
```ts
{
  _id: ObjectId,
  textHash: string,       // sha1(srcLang + '|' + srcText)
  srcLang: 'en' | 'ar',
  tgtLang: 'en' | 'ar',
  srcText: string,
  tgtText: string,
  createdAt: Date,
}
// Unique index on (textHash, tgtLang)
```

### 6.4 Degraded mode

If the translation service is OPEN (circuit broken) when the sync worker runs:
- Index the listing into LanceDB with **only the source-language fields populated**
- Leave the outbox row in place (don't delete) but mark `translation_failed_at`
- A separate slow drain (every 5 min) retries translation-only for `translation_failed_at` rows

This means a listing posted during a translation outage is searchable in its source language immediately and becomes bilingual when the GPU recovers. The user never sees a failure.

### 6.5 Files

- ➕ `models/TranslationCache.ts`
- ➕ `lib/translation/client.ts` — talks to `translation/app.py` via shared http-client + breaker
- ➕ `lib/translation/pipeline.ts` — implements `ensureTranslated()`
- ✏️ `lib/workers/lancedb-sync.ts` — call `ensureTranslated()` before LanceDB upsert
- ✏️ [models/Product.ts](../models/Product.ts) — add `title_en`, `title_ar`, `description_en`, etc. (kept alongside `title`/`description`, those become read-only legacy)

---

## 7. Cross-cutting performance details (the things juniors miss)

### 7.1 Concurrency limits, end to end

Each Python service is single-worker by design. Our Node side must respect that:

| Service | Server concurrency | Our client semaphore | Why |
|---|---|---|---|
| chatbot | uvicorn (asyncio, ~100s of concurrent reqs OK) | 32 | Plenty of headroom |
| lancedb | 1 writer at a time (asyncio.Lock), reads parallel | 1 for writes, 16 for reads | Don't queue at the server — queue at the client where we can observe |
| translation | 1 GPU, ~64-text batches every ~20ms | 8 concurrent requests | Past 8, queue saturates |

Implement using `p-limit` per upstream. Reject (don't queue) when the semaphore is full and the breaker is half-open — the system is already struggling, don't make it worse.

### 7.2 Embedding-call coalescing

The lancedb service calls the embedding server (`EMBED_API_BASE`) on every upsert. The same query text sent twice in a second → two embedding calls. Use the `embedding:` LRU cache (§3.4) on the **Python side** as well — or, simpler, ensure the Node-side `lru-cache` covers query embeddings via the search single-flight key.

### 7.3 Embed batching across requests in the sync worker

When the outbox drains 50 rows, the resulting translation call batches 50 listings worth of text in one GPU pass. Don't loop one-at-a-time. The translation service explicitly supports `/translate/listings` for this reason. Same for the lancedb upsert — one `/listings/batch` call with all 50.

### 7.4 Cancellation propagation

Every Python call gets an `AbortSignal` tied to the inbound request's signal. If the user navigates away, we cancel — and on the chatbot SSE path, the server-side stream stops too. Saves real GPU time on long replies abandoned by the user.

### 7.5 Don't deserialize twice on the SSE path

Naïve SSE pipelines `JSON.parse(chunk) → process → JSON.stringify → enqueue`. Instead, when the chatbot streams text tokens, forward the raw bytes through a `TransformStream` that only repackages them in SSE framing. Saves CPU on hot path.

### 7.6 Mongo indexes implied by this plan

Add (if missing — check [docs/DATABASE_INDEXES.md](../docs/DATABASE_INDEXES.md) first):
- `listing_sync_outbox`: `{ nextAttemptAt: 1 }`, `{ productId: 1 }`
- `translation_cache`: `{ textHash: 1, tgtLang: 1 }` unique
- `products`: ensure `_id` is the only common access path from sync worker; no new index needed

---

## 8. Observability — non-optional

For each service client, emit:

- `service.{name}.requests_total{outcome}` — outcome ∈ {success, timeout, breaker_open, http_5xx, network_error}
- `service.{name}.latency_ms` — histogram
- `service.{name}.breaker_state{state}` — gauge

For the sync worker:

- `outbox.depth` — gauge (current backlog)
- `outbox.drained_total` — counter
- `outbox.attempts_total{op,result}` — counter
- `outbox.oldest_age_ms` — gauge (alert if > 10 min — sync is broken)

For reconciliation:

- `reconcile.divergence_count{kind}` — counter (kind ∈ {missing_in_lancedb, missing_in_mongo, hash_mismatch})
- Alert if any non-zero count appears two runs in a row.

Logging: use existing [lib/logger.ts](../lib/logger.ts) with `service` field always set.

---

## 9. Implementation sequencing

Don't try to land all of this in one PR. Six phases, each independently shippable and reversible.

| # | Phase | Touches | Done when |
|---|---|---|---|
| 1 | Shared service infra | `lib/services/` | Unit tests pass; chatbot route uses pooled client (no behaviour change) |
| 2 | Chatbot hardening | `app/api/ai-chat`, `lib/chatbot-service.ts` | Breaker + single-flight live; mock fallback deleted; sessionId persisted client-side |
| 3 | Outbox + sync worker (scaffolding only — no LanceDB writes yet) | `models/SyncOutbox.ts`, `lib/workers/`, `lib/api/listings/service.ts` | Creating a listing inserts an outbox row; worker drains it but only logs |
| 4 | Translation client + cache | `lib/translation/`, `models/TranslationCache.ts`, `models/Product.ts` | Outbox worker calls translation service, populates `*_en`/`*_ar` on Product |
| 5 | LanceDB write integration | `lib/search/lancedb-client.ts`, `lancedb/app.py` additions | Outbox worker upserts to LanceDB; reconciliation job lands and reports zero divergence on a fresh DB |
| 6 | LanceDB hybrid search read path + SSE chatbot streaming | `app/api/listings/search/route.ts`, `chatbot/app.py` `astream_chat`, `components/AIChatbot.tsx` | Search returns LanceDB-ranked results; chatbot streams first token < 300ms |

Hard gate between phases: each must have its observability hooks in place before the next starts. Otherwise debugging the next phase is blind.

---

## 10. Things explicitly out of scope (and why)

- **Rewriting Python in TypeScript.** Discussed separately — `transformers`/`camel-tools`/`pyarabic` have no TS equivalents worth the migration cost. Keep them in Python.
- **Distributed tracing (OpenTelemetry).** Worth doing eventually, but adds another moving part. Defer until §8 metrics expose a problem that traces would solve.
- **Redis L2 cache.** Single-instance LRU is enough until we run multiple Next.js replicas *and* see measurable thundering-herd on Python. One thing at a time.
- **Auto-scaling Python services.** Each has a single-worker constraint (GPU lock, write lock). Horizontal scaling requires a load-balancer with session-affinity for chatbot and a coordinator for lancedb writes. Big project. Plan separately when traffic warrants.
- **Replacing Mongo with Postgres + pgvector.** Would simplify the outbox (real transactions, `LISTEN/NOTIFY`) but is a much larger migration. Note the option; don't take it now.

---

## 11. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Sync worker falls behind permanently | High | `outbox.oldest_age_ms` alert + reconciliation job catches drift |
| Translation service GPU OOM under burst | Med | Client-side semaphore of 8; breaker on 5 timeouts in 10s |
| Outbox transaction requires replica-set Mongo we don't have | Med | Two-phase variant in §5.3 works without transactions |
| Embedding-server downtime cascades to lancedb writes | Med | lancedb already calls embedding async; our sync worker sees a 5xx, backs off, retries |
| LanceDB index corruption | Low | Reconciliation rebuilds from Mongo — primary fix is always "rerun the worker" |
| Chatbot context grows unbounded per session | Med | TTL on session collection (already in place, bump to 1800s); enforce max-history-length server-side |
| Python service accidentally exposed to public internet | **Critical** | P7: bind private, no `NEXT_PUBLIC_` env vars, code-level browser guard, optional `X-Internal-Auth` token, CI grep against bundles |
| Client passes another user's `session_id` to read their chat history | High | Next.js derives `session_id` from authenticated user id; never trust browser-supplied value |

---

## 12. What "done" looks like

- Creating a listing returns 201 in < 200ms p95, never blocked on Python
- Within 30s of creation, the listing is searchable bilingually via `/api/listings/search`
- Killing the chatbot service does not break the listings page or the chatbot UI (graceful degraded reply)
- Killing the translation service does not block new listings (they're indexed monolingually and translated when GPU recovers)
- Killing the lancedb service does not block new listings (they queue in outbox and drain on recovery)
- Reconciliation reports zero divergence on a steady-state catalog
- p95 chatbot first-byte ≤ 300ms with streaming enabled
- p95 search ≤ 250ms with warm LRU; ≤ 400ms cold
