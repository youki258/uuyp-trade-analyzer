import time
from dataclasses import dataclass
from threading import Lock


@dataclass(frozen=True)
class RateLimitRule:
    max_requests: int
    window_seconds: int


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._store: dict[str, list[float]] = {}
        self._lock = Lock()

    def allow(self, key: str, rule: RateLimitRule) -> bool:
        now = time.time()
        threshold = now - rule.window_seconds

        with self._lock:
            entries = self._store.get(key, [])
            entries = [ts for ts in entries if ts > threshold]
            if len(entries) >= rule.max_requests:
                self._store[key] = entries
                return False
            entries.append(now)
            self._store[key] = entries
            return True
