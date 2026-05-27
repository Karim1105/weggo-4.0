"""
Inference worker: owns the GPU, batches concurrent requests.
"""

import queue
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

from translator import BilingualTranslator


BATCH_WINDOW_MS = 20
MAX_BATCH_TEXTS = 64


@dataclass
class _Job:
    job_id: str
    texts: List[str]
    src: str
    tgt: str
    submitted_at: float
    done: threading.Event = field(default_factory=threading.Event)
    results: List[str] = field(default_factory=list)
    error: Exception = None


class InferenceWorker:
    def __init__(self, translator: BilingualTranslator):
        self._translator = translator
        self._queue: "queue.Queue[_Job]" = queue.Queue()
        self._thread = threading.Thread(target=self._run, name="inference-worker", daemon=True)
        self._stop = threading.Event()
        self._thread.start()

    def submit(self, texts: List[str], src: str, tgt: str, timeout: float = 60.0) -> List[str]:
        if not texts:
            return []
        job = _Job(
            job_id=str(uuid.uuid4()),
            texts=texts,
            src=src,
            tgt=tgt,
            submitted_at=time.monotonic(),
        )
        self._queue.put(job)
        if not job.done.wait(timeout=timeout):
            raise TimeoutError(f"Translation job {job.job_id} timed out after {timeout}s")
        if job.error is not None:
            raise job.error
        return job.results

    def shutdown(self) -> None:
        self._stop.set()
        self._queue.put(None)  # type: ignore[arg-type]
        self._thread.join(timeout=5.0)

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                first = self._queue.get(timeout=1.0)
            except queue.Empty:
                continue
            if first is None:
                return

            jobs: List[_Job] = [first]
            deadline = time.monotonic() + BATCH_WINDOW_MS / 1000.0
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                try:
                    nxt = self._queue.get(timeout=remaining)
                except queue.Empty:
                    break
                if nxt is None:
                    self._stop.set()
                    break
                jobs.append(nxt)

            try:
                self._process(jobs)
            except Exception as e:
                for job in jobs:
                    if not job.done.is_set():
                        job.error = e
                        job.done.set()

    def _process(self, jobs: List[_Job]) -> None:
        by_dir: Dict[Tuple[str, str], List[Tuple[int, int, str]]] = {}
        for j_idx, job in enumerate(jobs):
            job.results = [""] * len(job.texts)
            for t_idx, text in enumerate(job.texts):
                by_dir.setdefault((job.src, job.tgt), []).append((j_idx, t_idx, text))

        for (src, tgt), entries in by_dir.items():
            for start in range(0, len(entries), MAX_BATCH_TEXTS):
                chunk = entries[start : start + MAX_BATCH_TEXTS]
                texts = [e[2] for e in chunk]
                translated = self._translator.translate_batch(texts, src, tgt)
                for (j_idx, t_idx, _), out in zip(chunk, translated):
                    jobs[j_idx].results[t_idx] = out

        for job in jobs:
            job.done.set()
