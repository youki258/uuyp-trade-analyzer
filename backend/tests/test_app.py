import io
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from server.app import create_stateless_app


ORIGIN = "http://localhost"


@pytest.fixture
def app(tmp_path: Path):
    app = create_stateless_app(tmp_path)
    app.config.update(TESTING=True)

    @app.get("/_test-error")
    def test_error():
        raise RuntimeError("secret internal detail")

    return app


def _login_with_mock_token(client):
    mock_client = MagicMock(nickname="tester", user_id="user-1")
    with patch("exporter.client.UUYPClient", return_value=mock_client):
        response = client.post(
            "/api/auth/token",
            json={"token": "token-12345678901234567890", "appType": "web"},
            headers={"Origin": ORIGIN},
        )
    assert response.status_code == 200
    return response


def test_auth_me_masks_token_and_reveal_requires_auth(app):
    client = app.test_client()

    assert client.get("/api/auth/me").get_json() == {"authenticated": False}
    unauthenticated = client.get("/api/auth/token")
    assert unauthenticated.status_code == 401
    assert unauthenticated.get_json() == {
        "status": "error",
        "code": "not_authenticated",
        "message": "not authenticated",
        "detail": "not authenticated",
    }
    _login_with_mock_token(client)

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.get_json()["tokenMasked"] == "token-***7890"
    assert "12345678901234567890" not in me.get_data(as_text=True)

    reveal = client.get("/api/auth/token")
    assert reveal.status_code == 200
    assert reveal.get_json()["token"] == "token-12345678901234567890"

    second_reveal = client.get("/api/auth/token")
    assert second_reveal.status_code == 410
    assert second_reveal.get_json() == {
        "status": "error",
        "code": "token_already_revealed",
        "message": "token has already been revealed",
        "detail": "token has already been revealed",
    }


def test_validation_errors_use_the_public_error_envelope(app):
    response = app.test_client().post(
        "/api/auth/token",
        json={"token": ""},
        headers={"Origin": ORIGIN},
    )

    assert response.status_code == 400
    assert response.get_json() == {
        "status": "error",
        "code": "token_required",
        "message": "token is required",
        "detail": "token is required",
    }


def test_fetch_start_returns_accepted_and_progress_is_readable(app):
    client = app.test_client()
    _login_with_mock_token(client)

    with patch("server.app.threading.Thread") as thread_cls:
        response = client.post(
            "/api/fetch/start",
            json={"exportSplit": True},
            headers={"Origin": ORIGIN},
        )

    assert response.status_code == 202
    assert response.get_json() == {"status": "started"}
    thread_cls.return_value.start.assert_called_once()

    progress = client.get("/api/fetch/progress")
    assert progress.status_code == 200
    assert progress.get_json()["status"] == "running"


def _create_download_url(client):
    _login_with_mock_token(client)
    upload = client.post(
        "/api/upload-csv",
        data={
            "files": (
                io.BytesIO("订单号,商品名称,成交价格(分),成交时间\norder-1,AK,100,2026-01-01\n".encode()),
                "sample.csv",
            )
        },
        content_type="multipart/form-data",
        headers={"Origin": ORIGIN},
    )
    assert upload.status_code == 200
    filename = upload.get_json()["saved"][0]

    ticket = client.post(
        "/api/download-ticket",
        json={"filename": filename},
        headers={"Origin": ORIGIN},
    )
    assert ticket.status_code == 200
    return ticket.get_json()["downloadUrl"]


def test_download_head_does_not_consume_ticket(app):
    client = app.test_client()
    download_url = _create_download_url(client)

    head = client.head(download_url)
    assert head.status_code == 200
    assert "attachment" in head.headers["Content-Disposition"]
    assert int(head.headers["Content-Length"]) > 0

    downloaded = client.get(download_url)
    assert downloaded.status_code == 200
    assert b"order-1" in downloaded.data

    consumed_again = client.get(download_url)
    assert consumed_again.status_code == 404


def test_download_ticket_works_without_session_cookie(app):
    owner = app.test_client()
    download_url = _create_download_url(owner)

    mobile_downloader = app.test_client()
    downloaded = mobile_downloader.get(download_url)

    assert downloaded.status_code == 200
    assert b"order-1" in downloaded.data


def test_global_error_handler_returns_safe_structured_error(app):
    response = app.test_client().get("/_test-error")

    assert response.status_code == 500
    assert response.get_json() == {
        "status": "error",
        "code": "internal_error",
        "message": "服务器内部错误",
        "detail": "服务器内部错误",
    }
    assert "secret internal detail" not in response.get_data(as_text=True)


def test_http_errors_use_structured_json(app):
    response = app.test_client().get("/_missing-route")

    assert response.status_code == 404
    payload = response.get_json()
    assert payload["status"] == "error"
    assert payload["code"] == 404
    assert payload["message"]
    assert payload["detail"] == payload["message"]


def test_rate_limited_response_includes_retry_after(app):
    client = app.test_client()
    request_payload = {"token": "too-short"}

    for _ in range(8):
        response = client.post(
            "/api/auth/token",
            json=request_payload,
            headers={"Origin": ORIGIN},
        )
        assert response.status_code == 400

    limited = client.post(
        "/api/auth/token",
        json=request_payload,
        headers={"Origin": ORIGIN},
    )
    assert limited.status_code == 429
    payload = limited.get_json()
    assert payload["code"] == "rate_limited"
    assert payload["retryAfterSeconds"] >= 1
    assert int(limited.headers["Retry-After"]) == payload["retryAfterSeconds"]


def test_sms_local_validation_does_not_consume_verification_limit(app):
    client = app.test_client()

    for _ in range(7):
        invalid = client.post(
            "/api/auth/sms/verify",
            json={"phone": "not-a-phone", "code": ""},
            headers={"Origin": ORIGIN},
        )
        assert invalid.status_code == 400
        assert invalid.get_json()["code"] == "invalid_phone_format"

    mock_class = MagicMock()
    mock_class.send_sms_code.return_value = (
        {"Code": 5050, "Msg": "请发送上行短信"},
        {"deviceId": "device-1"},
        {"deviceid": "device-1"},
    )
    mock_class.get_sms_up_sign_in_config.return_value = {
        "Code": 0,
        "Data": {"SmsUpContent": "短信验证", "SmsUpNumber": "106"},
    }
    mock_class.sms_sign_in.return_value = {"Code": 0, "Data": {"Token": "sms-token"}}
    mock_class.return_value = MagicMock(nickname="tester", user_id="user-1")

    with patch("exporter.client.UUYPClient", mock_class):
        sent = client.post(
            "/api/auth/sms/send",
            json={"phone": "13800000000"},
            headers={"Origin": ORIGIN},
        )
        assert sent.status_code == 200
        assert sent.get_json()["requiresManualSms"] is True

        verified = client.post(
            "/api/auth/sms/verify",
            json={"phone": "13800000000", "code": ""},
            headers={"Origin": ORIGIN},
        )

    assert verified.status_code == 200
    assert verified.get_json()["auth"]["authenticated"] is True
