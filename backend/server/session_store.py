import time
import uuid
from dataclasses import dataclass, field
from threading import Lock
from typing import Any


@dataclass
class SessionRecord:
    session_id: str
    created_at: float
    expires_at: float
    data: dict[str, Any] = field(default_factory=dict)


class InMemorySessionStore:
    def __init__(self, session_ttl_seconds: int, max_sessions: int) -> None:
        self._ttl = session_ttl_seconds
        self._max_sessions = max_sessions
        self._items: dict[str, SessionRecord] = {}
        self._lock = Lock()

    def create(self) -> SessionRecord | None:
        now = time.time()
        record = SessionRecord(
            session_id=uuid.uuid4().hex,
            created_at=now,
            expires_at=now + self._ttl,
            data={},
        )
        with self._lock:
            if len(self._items) >= self._max_sessions:
                # 尝试先回收过期会话，避免会话数无限增长。
                for session_id in list(self._items.keys()):
                    if self._items[session_id].expires_at <= now:
                        self._items.pop(session_id, None)

            if len(self._items) >= self._max_sessions:
                return None

            self._items[record.session_id] = record
        return record

    def get(self, session_id: str | None) -> SessionRecord | None:
        if not session_id:
            return None
        now = time.time()
        with self._lock:
            record = self._items.get(session_id)
            if not record:
                return None
            if record.expires_at <= now:
                self._items.pop(session_id, None)
                return None
            return record

    def touch(self, session_id: str) -> SessionRecord | None:
        now = time.time()
        with self._lock:
            record = self._items.get(session_id)
            if not record:
                return None
            if record.expires_at <= now:
                self._items.pop(session_id, None)
                return None
            record.expires_at = now + self._ttl
            return record

    def destroy(self, session_id: str | None) -> None:
        if not session_id:
            return
        with self._lock:
            self._items.pop(session_id, None)

    def cleanup_expired(self) -> int:
        now = time.time()
        removed = 0
        with self._lock:
            for session_id in list(self._items.keys()):
                if self._items[session_id].expires_at <= now:
                    self._items.pop(session_id, None)
                    removed += 1
        return removed

    def count(self) -> int:
        with self._lock:
            return len(self._items)

    def active_session_ids(self) -> set[str]:
        with self._lock:
            return set(self._items.keys())
