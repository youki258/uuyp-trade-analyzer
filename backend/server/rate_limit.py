import time
from dataclasses import dataclass
from threading import Lock

# 每隔多少次请求触发一次过期键清理
_CLEANUP_INTERVAL = 200
# 清理时使用的最长保留时间（秒），超过此时间无请求的键会被移除
_DEFAULT_MAX_AGE = 3600


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

            # 定期清理所有过期键，防止内存泄漏
            if self._request_count % _CLEANUP_INTERVAL == 0:
                cutoff = now - _DEFAULT_MAX_AGE
                self._store = {
                    k: [ts for ts in v if ts > cutoff]
                    for k, v in self._store.items()
                    if any(ts > cutoff for ts in v)
                }

            return True

    def cleanup(self, max_age_seconds: float = _DEFAULT_MAX_AGE) -> None:
        """显式清理过期键

        :param max_age_seconds: 超过此时间无请求的键会被移除
        """
        with self._lock:
            cutoff = time.time() - max_age_seconds
            self._store = {
                k: [ts for ts in v if ts > cutoff]
                for k, v in self._store.items()
                if any(ts > cutoff for ts in v)
            }
