import time
import uuid
from dataclasses import dataclass
from threading import Lock


@dataclass
class DownloadTicket:
    token: str
    session_id: str
    filename: str
    expires_at: float


class OneTimeDownloadTicketStore:
    def __init__(self) -> None:
        self._items: dict[str, DownloadTicket] = {}
        self._lock = Lock()

    def create(self, session_id: str, filename: str, ttl_seconds: int = 120) -> str:
        now = time.time()
        token = uuid.uuid4().hex
        ticket = DownloadTicket(
            token=token,
            session_id=session_id,
            filename=filename,
            expires_at=now + max(30, ttl_seconds),
        )
        with self._lock:
            self._items[token] = ticket
        return token

    def consume(self, token: str, session_id: str) -> str | None:
        now = time.time()
        with self._lock:
            ticket = self._items.pop(token, None)
            if not ticket:
                return None
            if ticket.expires_at <= now:
                return None
            if ticket.session_id != session_id:
                return None
            return ticket.filename

    def invalidate_session(self, session_id: str | None) -> None:
        if not session_id:
            return
        with self._lock:
            for token in list(self._items.keys()):
                if self._items[token].session_id == session_id:
                    self._items.pop(token, None)

    def cleanup_expired(self) -> int:
        now = time.time()
        removed = 0
        with self._lock:
            for token in list(self._items.keys()):
                if self._items[token].expires_at <= now:
                    self._items.pop(token, None)
                    removed += 1
        return removed
