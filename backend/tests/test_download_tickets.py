from server.download_tickets import OneTimeDownloadTicketStore


def test_peek_does_not_consume_ticket_and_sessionless_consume_returns_ticket():
    store = OneTimeDownloadTicketStore()
    token = store.create("a" * 32, "orders.csv")

    peeked = store.peek(token)
    assert peeked is not None
    assert peeked.filename == "orders.csv"

    consumed = store.consume(token)
    assert consumed is not None
    assert consumed.session_id == "a" * 32
    assert store.peek(token) is None


def test_mismatched_session_does_not_consume_ticket():
    store = OneTimeDownloadTicketStore()
    token = store.create("a" * 32, "orders.csv")

    assert store.consume(token, "b" * 32) is None
    assert store.peek(token) is not None
