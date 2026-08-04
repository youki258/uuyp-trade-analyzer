import time

from server.session_store import InMemorySessionStore


def test_session_store_applies_global_and_per_ip_limits_atomically():
    store = InMemorySessionStore(session_ttl_seconds=3600, max_sessions=100)

    for _ in range(3):
        record, reason = store.create("192.0.2.1", max_sessions_per_ip=3)
        assert record is not None
        assert reason is None

    record, reason = store.create("192.0.2.1", max_sessions_per_ip=3)
    assert record is None
    assert reason == "ip_limit"

    record, reason = store.create("192.0.2.2", max_sessions_per_ip=3)
    assert record is not None
    assert reason is None


def test_session_store_reclaims_expired_records_before_admission():
    store = InMemorySessionStore(session_ttl_seconds=3600, max_sessions=100)
    record, reason = store.create("192.0.2.3", max_sessions_per_ip=3)
    assert record is not None
    assert reason is None
    record.expires_at = time.time() - 1

    replacement, reason = store.create("192.0.2.3", max_sessions_per_ip=3)
    assert replacement is not None
    assert reason is None
    assert store.count() == 1
