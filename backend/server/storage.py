import shutil
import tempfile
import re
import time
from pathlib import Path


class SessionArtifactStore:
    def __init__(self, base_dir: Path | None = None) -> None:
        root = base_dir or Path(tempfile.gettempdir()) / "uuyp_stateless"
        self._base_dir = root
        self._base_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _is_valid_session_id(session_id: str | None) -> bool:
        if not session_id:
            return False
        return bool(re.fullmatch(r"[a-f0-9]{32}", session_id))

    def _safe_session_path(self, session_id: str) -> Path | None:
        if not self._is_valid_session_id(session_id):
            return None
        base_resolved = self._base_dir.resolve()
        target = (self._base_dir / session_id).resolve()
        if base_resolved == target or base_resolved in target.parents:
            return target
        return None

    def session_dir(self, session_id: str) -> Path:
        path = self._safe_session_path(session_id)
        if not path:
            raise ValueError("invalid session id")
        path.mkdir(parents=True, exist_ok=True)
        return path

    def list_csv_files(self, session_id: str) -> list[dict]:
        path = self._safe_session_path(session_id)
        if not path:
            return []
        path.mkdir(parents=True, exist_ok=True)
        files = []
        for csv_file in sorted(path.glob("*.csv"), key=lambda x: x.stat().st_mtime, reverse=True):
            files.append(
                {
                    "name": csv_file.name,
                    "size": csv_file.stat().st_size,
                    "mtime": csv_file.stat().st_mtime,
                }
            )
        return files

    def resolve_session_file(self, session_id: str, filename: str) -> Path | None:
        if not self._is_valid_session_id(session_id):
            return None
        safe_name = Path(filename).name
        path = self.session_dir(session_id) / safe_name
        if path.exists() and path.is_file():
            return path
        return None

    def remove_session(self, session_id: str | None) -> None:
        if not self._is_valid_session_id(session_id):
            return
        path = self._safe_session_path(session_id)
        if not path:
            return
        if path.exists() and path.is_dir():
            shutil.rmtree(path)

    def cleanup_expired(self, active_session_ids: set[str], ttl_seconds: int) -> int:
        removed = 0
        now = time.time()
        ttl = max(120, ttl_seconds)

        for child in self._base_dir.iterdir():
            if not child.is_dir():
                continue

            session_id = child.name
            session_path = self._safe_session_path(session_id)
            if not session_path:
                continue

            try:
                is_active = session_id in active_session_ids
                is_old = (now - session_path.stat().st_mtime) > ttl
                if (not is_active) or is_old:
                    shutil.rmtree(session_path, ignore_errors=True)
                    removed += 1
            except FileNotFoundError:
                # 目录可能被并发删除，跳过即可。
                continue
            except OSError:
                # 清理任务不应影响主流程。
                continue

        return removed
