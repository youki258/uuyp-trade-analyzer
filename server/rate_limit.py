import time
from dataclasses import dataclass
from threading import Lock

# 每隔多少次请求触发一次空键清理
_CLEANUP_INTERVAL = 200


@dataclass(frozen=True)
class RateLimitRule:
    max_requests: int
    window_seconds: int


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._store: dict[str, list[float]] = {}
        self._lock = Lock()
        self._request_count = 0

    def allow(self, key: str, rule: RateLimitRule) -> bool:
        now = time.time()
        threshold = now - rule.window_seconds

        with self._lock:
            self._request_count += 1
            entries = self._store.get(key, [])
            entries = [ts for ts in entries if ts > threshold]
            if len(entries) >= rule.max_requests:
                self._store[key] = entries
                return False
            entries.append(now)
            self._store[key] = entries

            # 定期清理空键，防止内存泄漏
            if self._request_count % _CLEANUP_INTERVAL == 0:
                self._store = {k: v for k, v in self._store.items() if v}

            return True

    def cleanup(self) -> None:
        """显式清理所有过期空键"""
        with self._lock:
            now = time.time()
            self._store = {
                k: [ts for ts in v if ts > now - 3600]
                for k, v in self._store.items()
                if any(ts > now - 3600 for ts in v)
            }
