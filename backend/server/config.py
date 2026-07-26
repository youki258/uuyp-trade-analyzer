import os
from dataclasses import dataclass


@dataclass(frozen=True)
class StatelessConfig:
    session_cookie_name: str
    session_ttl_seconds: int
    max_sessions: int
    cleanup_interval_seconds: int
    artifact_ttl_seconds: int
    cookie_secure: bool
    cookie_samesite: str


TRUE_VALUES = {"1", "true", "yes", "on"}


def _to_bool(value: str, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in TRUE_VALUES


def load_config() -> StatelessConfig:
    cookie_name = os.getenv("UUYP_SESSION_COOKIE_NAME", "uuyp_sid").strip() or "uuyp_sid"
    ttl_raw = os.getenv("UUYP_SESSION_TTL_SECONDS", "3600").strip()
    try:
        ttl = int(ttl_raw)
    except ValueError:
        ttl = 3600
    ttl = max(60, ttl)

    max_sessions_raw = os.getenv("UUYP_SESSION_MAX_COUNT", "100").strip()
    try:
        max_sessions = int(max_sessions_raw)
    except ValueError:
        max_sessions = 100
    max_sessions = max(100, max_sessions)

    cleanup_raw = os.getenv("UUYP_CLEANUP_INTERVAL_SECONDS", "300").strip()
    try:
        cleanup_interval = int(cleanup_raw)
    except ValueError:
        cleanup_interval = 300
    cleanup_interval = max(5, cleanup_interval)

    artifact_ttl_raw = os.getenv("UUYP_ARTIFACT_TTL_SECONDS", str(ttl)).strip()
    try:
        artifact_ttl = int(artifact_ttl_raw)
    except ValueError:
        artifact_ttl = ttl
    artifact_ttl = max(120, artifact_ttl)

    secure = _to_bool(os.getenv("UUYP_COOKIE_SECURE"), default=False)
    samesite = os.getenv("UUYP_COOKIE_SAMESITE", "Strict").strip() or "Strict"
    if samesite not in {"Strict", "Lax", "None"}:
        samesite = "Strict"
    if samesite == "None" and not secure:
        # 浏览器对 SameSite=None 要求 Secure=true。
        secure = True

    return StatelessConfig(
        session_cookie_name=cookie_name,
        session_ttl_seconds=ttl,
        max_sessions=max_sessions,
        cleanup_interval_seconds=cleanup_interval,
        artifact_ttl_seconds=artifact_ttl,
        cookie_secure=secure,
        cookie_samesite=samesite,
    )
