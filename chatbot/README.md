# Marketplace Chatbot — FastAPI

## Project structure

```
app.py            ← FastAPI application
requirements.txt  ← Python dependencies
.env              ← Environment variables (create this yourself)
```

---

## Environment variables

Create a `.env` file (or set these in your shell / Docker config):

```env
GOOGLE_API_KEY=your_key_here
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=marketplace_chatbot
SESSIONS_COLLECTION=sessions
LANCEDB_URI=./semantic-lancedb-qwen3-emb
EMBED_API_BASE=http://0.0.0.0:8080/v1
SESSION_TTL_SECS=180
```

Load them before starting: `export $(cat .env | xargs)`

---

## Running

### Development
```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 5050 --reload
```

### Production
```bash
uvicorn app:app --host 0.0.0.0 --port 5050 --workers 1
```

> **Why `--workers 1`?**  
> The LanceDB index, LLM client, and embedding model are shared singletons
> that aren't safe to fork across OS processes. Use a single worker and
> scale horizontally with multiple containers behind a load balancer if
> you need more throughput. Uvicorn handles many concurrent requests
> within that one worker via asyncio — so a single worker is already far
> more capable than a single-threaded Flask/Gunicorn setup.

### Interactive API docs
Visit `http://100.78.155.72:5050/docs` for the auto-generated Swagger UI.

---

## How concurrency works

```
Request A (user_001) ──┐
Request B (user_002) ──┼──► uvicorn event loop ──► all run concurrently (different sessions)
Request C (user_001) ──┘                        ──► same session? queued behind A via per-session lock
```

- **Different sessions** — handled fully concurrently by asyncio. No blocking.
- **Same session, two rapid messages** — the per-session `asyncio.Lock` ensures they
  are processed in order, preventing memory corruption.

---

## API reference

### `GET /health`
Returns `{"status": "ok"}`.

---

### `POST /chat`

**Request body:**
```json
{ "session_id": "user_abc123", "message": "looking for a Samsung Galaxy S23" }
```

**Response:**
```json
{ "session_id": "user_abc123", "reply": "..." }
```

- **Search result** → `reply` is a JSON string matching the listing schema. Parse with `JSON.parse()`.
- **Conversational / error** → `reply` is plain text.

---

### `DELETE /session/{session_id}`
Clears the user's conversation history.

```json
{ "status": "cleared", "session_id": "user_abc123" }
```

---

## Integrating with Next.js

### 1. Add API URL to `.env.local`
```
CHATBOT_API_URL=http://0.0.0.0:5050
```

### 2. Create a Next.js API proxy route

`app/api/chat/route.ts`
```typescript
import { NextRequest, NextResponse } from "next/server";

const CHATBOT_URL = process.env.CHATBOT_API_URL ?? "http://0.0.0.0:5050";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res  = await fetch(`${CHATBOT_URL}/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

### 3. Use in your React component

```tsx
async function sendMessage(sessionId: string, message: string) {
  const res = await fetch("/api/chat", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ session_id: sessionId, message }),
  });
  const { reply } = await res.json();

  try {
    return JSON.parse(reply);   // structured listing results
  } catch {
    return { message: reply };  // conversational / off-topic text
  }
}
```

---

## CORS

`CORSMiddleware` is currently set to `allow_origins=["*"]`.  
Tighten this in production:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```
