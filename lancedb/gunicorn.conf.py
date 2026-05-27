# gunicorn.conf.py
# Run with: gunicorn -c gunicorn.conf.py app:app
#
# Concurrency model
# ─────────────────────────────────────────────────────────────────────────────
# FastAPI runs on an asyncio event loop (uvicorn worker class).
# Each request is a coroutine — while it awaits the embedding server or
# LanceDB, the event loop serves other requests at zero OS-thread cost.
#
# Blocking calls (LlamaIndex embedding, LanceDB write, optimize()) are
# offloaded to a ThreadPoolExecutor via asyncio.to_thread(), keeping the
# event loop free.
#
# Workers = 1 is mandatory:
#   LanceDB is a file-based store with no cross-process write coordination.
#   The asyncio.Lock lives inside one event loop — it cannot protect against
#   races from a second worker process. One worker + one event loop is the
#   correct and safe configuration.
#
#   The single event loop handles hundreds of concurrent connections efficiently
#   because nearly all wait time is I/O (embedding server, file writes), not CPU.
#
# If you need horizontal scale, run multiple instances behind a load balancer
# and point each at its own LanceDB directory, or switch to a networked vector
# store (e.g. LanceDB Cloud) that supports concurrent writers.

# --- Workers & worker class ---
workers      = 1                   # must be 1 — see explanation above
worker_class = "uvicorn.workers.UvicornWorker"

# --- Timeouts ---
timeout          = 120             # batch embedding calls can take a while
graceful_timeout = 30
keepalive        = 5

# --- Binding ---
bind = "0.0.0.0:5000"

# --- Logging ---
accesslog = "-"
errorlog  = "-"
loglevel  = "info"

# --- Do not preload ---
# preload_app=True forks after import — unsafe with asyncio.Lock and
# CAMeL Tools native extensions.
preload_app = False
