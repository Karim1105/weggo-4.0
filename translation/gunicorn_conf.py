"""
Gunicorn config for the translation API.

KEY POINT: workers = 1.
  Each worker process loads its own copy of both models into GPU memory.
  With workers=2 you double VRAM use and split the request stream between
  two separate batching queues that can't share work. workers=1 with many
  threads is the right shape for a single-GPU service.

  If you ever scale to multiple GPUs, run one worker per GPU and pin each to
  its own device via CUDA_VISIBLE_DEVICES — but that's a separate setup, not
  just a workers count change.

Threads handle concurrent HTTP connections. Each request thread spends nearly
all its time blocked on the inference worker's response Event, so threads are
the right concurrency primitive — the GIL isn't a bottleneck here.
"""

import os

bind = os.environ.get("GUNICORN_BIND", "0.0.0.0:8000")
workers = 1
threads = int(os.environ.get("GUNICORN_THREADS", "16"))
worker_class = "gthread"
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "120"))
graceful_timeout = 30
keepalive = 5

# preload_app MUST be False: the InferenceWorker starts a daemon thread at
# module import time. Threads do not survive fork(), so with preload_app=True
# the queue has no consumer in the forked worker process and every translate
# request hangs until timeout. With workers=1 the only cost of preload=False
# is loading the models inside the worker instead of the master.
preload_app = False

accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
