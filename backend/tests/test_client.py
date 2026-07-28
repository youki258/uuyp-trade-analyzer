"""测试 UUYPClient 登录与 API 调用路径（全部 mock requests，不发真实请求）"""
from unittest.mock import MagicMock, patch

import pytest
import requests

from exporter.client import UUYPClient


def _mock_response(payload, status_code=200):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = payload
    return resp


def _make_client():
    """构造不触发网络请求的客户端（web 模式跳过 _fetch_uk，无 token 跳过 _verify_token）"""
    return UUYPClient(token="", app_type="web")


# ==================== 登录路径 ====================

class TestPwdSignIn:
    @patch("exporter.client.requests.post")
    def test_success_returns_token(self, mock_post):
        mock_post.return_value = _mock_response(
            {"Code": 0, "Data": {"Token": "tok_abc123"}}
        )
        result = UUYPClient.pwd_sign_in("13800000000", "password")
        assert result["Data"]["Token"] == "tok_abc123"
        # 应请求密码登录端点
        url = mock_post.call_args[0][0]
        assert url.endswith("/api/user/Auth/PwdSignIn")
        # 请求体应携带用户名密码
        payload = mock_post.call_args[1]["json"]
        assert payload["UserName"] == "13800000000"
        assert payload["UserPwd"] == "password"

    @patch("exporter.client.requests.post")
    def test_failure_returns_raw_result(self, mock_post):
        mock_post.return_value = _mock_response({"Code": 401, "Msg": "密码错误"})
        result = UUYPClient.pwd_sign_in("13800000000", "wrong")
        assert result["Code"] == 401
        assert "Token" not in result.get("Data", {})


class TestSmsSignIn:
    @patch("exporter.client.requests.post")
    def test_with_code_uses_sms_sign_in_endpoint(self, mock_post):
        mock_post.return_value = _mock_response(
            {"Code": 0, "Data": {"Token": "tok_sms"}}
        )
        result = UUYPClient.sms_sign_in("13800000000", "123456", "sess_id", headers={})
        assert result["Data"]["Token"] == "tok_sms"
        url = mock_post.call_args[0][0]
        assert url.endswith("/api/user/Auth/SmsSignIn")
        payload = mock_post.call_args[1]["json"]
        assert payload["Code"] == "123456"
        assert payload["Sessionid"] == "sess_id"

    @patch("exporter.client.requests.post")
    def test_empty_code_uses_sms_up_sign_in_endpoint(self, mock_post):
        mock_post.return_value = _mock_response(
            {"Code": 0, "Data": {"Token": "tok_up"}}
        )
        UUYPClient.sms_sign_in("13800000000", "", "sess_id", headers={})
        url = mock_post.call_args[0][0]
        assert url.endswith("/api/user/Auth/SmsUpSignIn")

    @patch("exporter.client.requests.post")
    def test_failure_returns_result_without_raise(self, mock_post):
        mock_post.return_value = _mock_response({"Code": 84101, "Msg": "验证码错误"})
        result = UUYPClient.sms_sign_in("13800000000", "000000", "sess_id", headers={})
        assert result["Code"] == 84101


class TestSendSmsCode:
    @patch("exporter.client.requests.post")
    def test_returns_result_device_info_and_headers(self, mock_post):
        mock_post.return_value = _mock_response({"Code": 0, "Msg": "发送成功"})
        result, device_info, headers = UUYPClient.send_sms_code("13800000000")
        assert result["Code"] == 0
        assert device_info["deviceId"]
        # 后续 sms_sign_in 需复用同一设备头
        assert headers["deviceid"] == device_info["deviceId"]
        url = mock_post.call_args[0][0]
        assert url.endswith("/api/user/Auth/SendSignInSmsCode")

    @patch("exporter.client.requests.post")
    def test_5050_manual_sms_still_returns(self, mock_post):
        mock_post.return_value = _mock_response({"Code": 5050, "Msg": "需手动发送短信"})
        result, _, _ = UUYPClient.send_sms_code("13800000000")
        assert result["Code"] == 5050


# ==================== Token 验证 ====================

class TestVerifyToken:
    @patch.object(UUYPClient, "call_api")
    def test_valid_token_sets_user_info(self, mock_call):
        mock_call.return_value = _mock_response(
            {"Code": 0, "Data": {"NickName": "tester", "UserId": "u123"}}
        )
        client = UUYPClient(token="tok_valid", app_type="web")
        assert client.nickname == "tester"
        assert client.user_id == "u123"

    @patch.object(UUYPClient, "call_api")
    def test_invalid_token_raises(self, mock_call):
        mock_call.return_value = _mock_response({"Code": 401, "Msg": "Token 过期"})
        with pytest.raises(Exception, match="Token 无效或已过期"):
            UUYPClient(token="tok_expired", app_type="web")


# ==================== call_api ====================

class TestCallApi:
    def test_get_uses_session_get(self):
        client = _make_client()
        client.session.get = MagicMock(return_value=_mock_response({"Code": 0}))
        resp = client.call_api("GET", "/api/user/Account/getUserInfo")
        assert resp.status_code == 200
        url = client.session.get.call_args[0][0]
        assert url == f"{UUYPClient.BASE_URL}/api/user/Account/getUserInfo"

    def test_post_passes_json_payload(self):
        client = _make_client()
        client.session.post = MagicMock(return_value=_mock_response({"code": 0}))
        client.call_api("POST", "/api/test", {"pageIndex": 1})
        assert client.session.post.call_args[1]["json"] == {"pageIndex": 1}

    def test_unsupported_method_raises(self):
        client = _make_client()
        with pytest.raises(Exception):
            client.call_api("PATCH", "/api/test")

    def test_network_error_wrapped(self):
        client = _make_client()
        client.session.get = MagicMock(
            side_effect=requests.exceptions.ConnectionError("boom")
        )
        with pytest.raises(Exception, match="网络请求失败"):
            client.call_api("GET", "/api/test")


# ==================== 订单接口封装 ====================

class TestOrderApis:
    def test_get_sell_orders_hits_sell_list_path(self):
        client = _make_client()
        client.session.post = MagicMock(
            return_value=_mock_response({"code": 0, "data": {"orderList": []}})
        )
        result = client.get_sell_orders(page=2, order_status=340)
        assert result["code"] == 0
        url = client.session.post.call_args[0][0]
        assert url.endswith("/api/youpin/bff/trade/sale/v1/sell/list")
        payload = client.session.post.call_args[1]["json"]
        assert payload["pageIndex"] == 2
        assert payload["orderStatus"] == 340

    def test_get_buy_orders_hits_buy_list_path(self):
        client = _make_client()
        client.session.post = MagicMock(
            return_value=_mock_response({"code": 0, "data": {"orderList": []}})
        )
        client.get_buy_orders()
        url = client.session.post.call_args[0][0]
        assert url.endswith("/api/youpin/bff/trade/sale/v1/buy/list")

    def test_lease_in_without_path_returns_error_without_request(self):
        client = _make_client()
        client.session.post = MagicMock()
        result = client.get_lease_in_orders()
        assert result["Code"] == -1
        client.session.post.assert_not_called()
