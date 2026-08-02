import logging
import os
import time
import re
import threading
import uuid
import json
from pathlib import Path
from urllib.parse import urlparse

from flask import Flask, abort, g, jsonify, request, send_file, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.exceptions import HTTPException

from exporter.client import ApiResponse
from .config import load_config
from .download_tickets import OneTimeDownloadTicketStore
from .rate_limit import InMemoryRateLimiter, RateLimitRule
from .session_store import InMemorySessionStore
from .storage import SessionArtifactStore

logger = logging.getLogger(__name__)
audit_logger = logging.getLogger("uuyp.audit")


_PHONE_PATTERN = re.compile(r"^1[3-9]\d{9}$")


def _is_valid_phone(value: str) -> bool:
    return bool(_PHONE_PATTERN.fullmatch(value))


def _is_valid_sms_code(value: str) -> bool:
    if not value:
        return True
    return bool(re.fullmatch(r"\d{4,8}", value))


MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024
MAX_UPLOAD_FILES = 8
CSV_HEADER_KEYWORDS = ["订单号", "商品名称", "成交价格", "成交时间", "订单类型", "交易方向"]


def _looks_like_csv(content: bytes) -> bool:
    if not content or b"\x00" in content:
        return False

    text = ""
    for encoding in ("utf-8-sig", "gbk", "utf-8"):
        try:
            text = content.decode(encoding, errors="ignore")
            break
        except Exception:
            continue

    if not text:
        return False

    first_line = text.splitlines()[0] if text.splitlines() else ""
    if not first_line:
        return False

    keyword_hits = sum(1 for kw in CSV_HEADER_KEYWORDS if kw in first_line)
    return "," in first_line and keyword_hits >= 1


def _check_same_origin() -> tuple[bool, str]:
    origin = request.headers.get("Origin", "")
    if not origin:
        # POST/PUT/DELETE 必须带 Origin 头，防止 CSRF
        if request.method in ("POST", "PUT", "DELETE", "PATCH"):
            return False, "missing origin header"
        return True, ""
    try:
        o = urlparse(origin)
        h = urlparse(request.host_url)
    except ValueError:
        return False, "invalid origin"
    # 比较 scheme / host / port，比直接字符串比对 host_url 更稳健，
    # 也能正确处理 ProxyFix 修正后的 request.host_url（含 https + youki.me）
    if (o.scheme, o.hostname, o.port) != (h.scheme, h.hostname, h.port):
        return False, "invalid origin"
    return True, ""


def _mask_value(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "***"
    return f"{value[:3]}***{value[-3:]}"


def _sanitize_log_fields(fields: dict) -> dict:
    redacted_keys = {"token", "password", "phone", "sessionId", "ticket"}
    sanitized: dict = {}
    for key, value in fields.items():
        if value is None:
            sanitized[key] = None
            continue
        if key in redacted_keys and isinstance(value, str):
            sanitized[key] = _mask_value(value)
            continue
        sanitized[key] = value
    return sanitized


def _audit(event: str, **fields) -> None:
    payload = {"event": event, **_sanitize_log_fields(fields)}
    audit_logger.info("[audit] %s", json.dumps(payload, ensure_ascii=False))


def _error_response(
    message: str,
    status_code: int,
    *,
    code: int | str | None = None,
    detail: str | None = None,
    **extra,
):
    """Return the stable public error envelope used by every API failure path."""
    payload = {
        "status": "error",
        "code": status_code if code is None else code,
        "message": message,
        "detail": message if detail is None else detail,
    }
    payload.update(extra)
    return jsonify(payload), status_code


def create_stateless_app(dist_dir: Path) -> Flask:
    """创建无状态临时服务应用。

    当前阶段仅提供静态页面和状态接口，后续步骤会逐步加入会话、上传、抓取和下载链路。
    """
    app = Flask(__name__, static_folder=None)
    # 按 LOG_LEVEL 环境变量初始化日志（默认 INFO）
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=getattr(logging, log_level, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    # 信任 Caddy 反向代理设置的 X-Forwarded-* 头。
    # 这会让 request.scheme 变为 https、request.host 变为 youki.me，
    # 从而 _check_same_origin 比较时 Origin (https://youki.me) 与 host_url 一致；
    # 否则 Caddy→Flask 是 http 直连，Flask 看到的 scheme/host 是反代后的内部值，
    # 同源校验会 403。
    # x_for/x_proto/x_host/x_prefix 都设为 1：只信任 1 层代理（Caddy 在公网只过一道）。
    app.wsgi_app = ProxyFix(  # type: ignore[method-assign]
        app.wsgi_app,
        x_for=1,
        x_proto=1,
        x_host=1,
        x_prefix=1,
    )
    cfg = load_config()
    sessions = InMemorySessionStore(cfg.session_ttl_seconds, cfg.max_sessions)
    rate_limiter = InMemoryRateLimiter()
    artifacts = SessionArtifactStore()
    tickets = OneTimeDownloadTicketStore()
    token_reveal_lock = threading.Lock()
    last_cleanup_at = 0.0

    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SECURE"] = cfg.cookie_secure
    app.config["SESSION_COOKIE_SAMESITE"] = cfg.cookie_samesite

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        status_code = error.code or 500
        message = error.description or "请求失败"
        return jsonify(
            {
                "status": "error",
                "code": status_code,
                "message": message,
                "detail": message,
            }
        ), status_code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        logger.exception("[server] unexpected request error: %s", error)
        return jsonify(
            {
                "status": "error",
                "code": "internal_error",
                "message": "服务器内部错误",
                "detail": "服务器内部错误",
            }
        ), 500

    @app.before_request
    def ensure_session():
        nonlocal last_cleanup_at
        now = time.time()
        if now - last_cleanup_at >= cfg.cleanup_interval_seconds:
            sessions.cleanup_expired()
            tickets.cleanup_expired()
            removed_dirs = artifacts.cleanup_expired(
                sessions.active_session_ids(),
                cfg.artifact_ttl_seconds,
            )
            if removed_dirs > 0:
                _audit("janitor.artifacts.cleaned", removedDirs=removed_dirs)
            last_cleanup_at = now

        # 销毁接口不自动创建新会话，避免“销毁后立刻重建”。
        if request.endpoint == "destroy_session":
            cookie_session_id = request.cookies.get(cfg.session_cookie_name)
            g.session_record = sessions.get(cookie_session_id)
            g.session_id = g.session_record.session_id if g.session_record else None
            g._skip_session_cookie = True
            return

        session_id = request.cookies.get(cfg.session_cookie_name)
        record = sessions.touch(session_id) if session_id else None
        if not record:
            record = sessions.create()
            if not record:
                return _error_response("server busy", 503, code="server_busy")
            g._set_session_cookie = record.session_id

        g.session_id = record.session_id
        g.session_record = record

    def _rate_limit_key(action: str, include_session: bool = False) -> str:
        remote_addr = request.remote_addr or "unknown"
        if include_session:
            return f"{action}:{remote_addr}:{getattr(g, 'session_id', 'none')}"
        return f"{action}:{remote_addr}"

    def _check_rate_limit(action: str, rule: RateLimitRule, include_session: bool = False):
        key = _rate_limit_key(action, include_session=include_session)
        if not rate_limiter.allow(key, rule):
            retry_after = max(1, rate_limiter.retry_after_seconds(key, rule))
            response, status_code = _error_response(
                "too many requests",
                429,
                code="rate_limited",
                retryAfterSeconds=retry_after,
            )
            response.headers["Retry-After"] = str(retry_after)
            return response, status_code
        return None

    def _check_rate_limit_both(action: str, ip_rule: RateLimitRule, session_rule: RateLimitRule):
        limited = _check_rate_limit(action, ip_rule, include_session=False)
        if limited:
            return limited
        return _check_rate_limit(action, session_rule, include_session=True)

    @app.after_request
    def set_cookie(response):
        if getattr(g, "_skip_session_cookie", False):
            return response

        session_id = getattr(g, "_set_session_cookie", None)
        if session_id:
            response.set_cookie(
                key=cfg.session_cookie_name,
                value=session_id,
                max_age=cfg.session_ttl_seconds,
                httponly=True,
                secure=cfg.cookie_secure,
                samesite=cfg.cookie_samesite,
                path="/",
            )
        # 安全 HTTP 头
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.route("/")
    def index():
        return send_from_directory(str(dist_dir), "index.html")

    @app.route("/assets/<path:filename>")
    def assets(filename: str):
        return send_from_directory(str(dist_dir / "assets"), filename)

    @app.route("/<path:filename>")
    def static_files(filename: str):
        target = dist_dir / filename
        if target.exists() and target.is_file():
            return send_from_directory(str(dist_dir), filename)
        return send_from_directory(str(dist_dir), "index.html")

    @app.route("/api/status")
    def api_status():
        remaining_ttl = max(0, int(g.session_record.expires_at - time.time()))
        return jsonify(
            {
                "status": "ok",
                "mode": "stateless",
                "dist_exists": dist_dir.exists(),
                "session": {
                    "exists": True,
                    "ttlSeconds": remaining_ttl,
                },
            }
        )

    @app.route("/api/session/info")
    def session_info():
        if not g.session_record:
            return jsonify({"session": {"exists": False, "ttlSeconds": 0}})

        remaining_ttl = max(0, int(g.session_record.expires_at - time.time()))
        return jsonify(
            {
                "session": {
                    "exists": True,
                    "ttlSeconds": remaining_ttl,
                }
            }
        )

    @app.route("/api/session/destroy", methods=["POST"])
    def destroy_session():
        ok, reason = _check_same_origin()
        if not ok:
            return _error_response(reason, 403, code="invalid_origin")

        sessions.destroy(g.session_id)
        tickets.invalidate_session(g.session_id)
        artifacts.remove_session(g.session_id)
        _audit("session.destroy", sessionId=g.session_id)
        g._set_session_cookie = None

        response = jsonify({"status": "ok", "message": "session destroyed"})
        response.delete_cookie(cfg.session_cookie_name, path="/")
        return response

    @app.route("/api/auth/token", methods=["POST"])
    def auth_token():
        limited = _check_rate_limit_both(
            "auth_token",
            RateLimitRule(max_requests=20, window_seconds=60),
            RateLimitRule(max_requests=8, window_seconds=60),
        )
        if limited:
            return limited

        ok, reason = _check_same_origin()
        if not ok:
            return _error_response(reason, 403, code="invalid_origin")

        payload = request.get_json(silent=True) or {}
        token = str(payload.get("token", "")).strip()
        app_type = str(payload.get("appType", "app")).strip() or "app"
        if app_type not in {"app", "web"}:
            app_type = "app"

        if not token:
            return _error_response("token is required", 400, code="token_required")
        if len(token) < 20 or len(token) > 4096:
            return _error_response("invalid token format", 400, code="invalid_token_format")

        try:
            from exporter.client import UUYPClient

            client = UUYPClient(token=token, app_type=app_type)
        except Exception:
            logger.exception("[auth] token verify failed")
            return _error_response("token invalid", 400, code="invalid_token")

        g.session_record.data["auth"] = {
            "token": token,
            "appType": app_type,
            "nickname": client.nickname,
            "userId": client.user_id,
            "tokenRevealUsed": False,
            "createdAt": time.time(),
        }
        g.session_record.data.pop("sms", None)
        _audit("auth.token.success", sessionId=g.session_id, appType=app_type, userId=client.user_id)

        return jsonify(
            {
                "status": "ok",
                "auth": {
                    "authenticated": True,
                    "nickname": client.nickname,
                    "userId": client.user_id,
                    "appType": app_type,
                },
            }
        )

    @app.route("/api/auth/sms/send", methods=["POST"])
    def auth_sms_send():
        ok, reason = _check_same_origin()
        if not ok:
            return _error_response(reason, 403, code="invalid_origin")

        payload = request.get_json(silent=True) or {}
        phone = str(payload.get("phone", "")).strip()
        region_code = payload.get("regionCode", 86)

        if not phone:
            return _error_response("phone is required", 400, code="phone_required")
        if not _is_valid_phone(phone):
            return _error_response("invalid phone format", 400, code="invalid_phone_format")

        try:
            region_code = int(region_code)
        except (TypeError, ValueError):
            region_code = 86

        limited = _check_rate_limit_both(
            "auth_sms_send",
            RateLimitRule(max_requests=3, window_seconds=300),
            RateLimitRule(max_requests=2, window_seconds=300),
        )
        if limited:
            return limited

        try:
            from exporter.client import UUYPClient

            result, device_info, headers = UUYPClient.send_sms_code(phone, region_code)
        except Exception:
            logger.exception("[auth] send sms failed")
            return _error_response("send sms failed", 500, code="sms_send_failed")

        response = ApiResponse.from_payload(result)
        code = response.code
        data = response.data
        msg = response.message

        if code not in {0, 5050}:
            return _error_response(msg, 400, code=code, hint="manual_or_token")

        g.session_record.data["sms"] = {
            "phone": phone,
            "regionCode": region_code,
            "deviceId": device_info.get("deviceId", ""),
            "headers": headers,
            "createdAt": time.time(),
        }

        # 5050 手动短信：尝试获取上行短信内容与目标号码，失败时静默降级
        sms_up_content = ""
        sms_up_number = ""
        if code == 5050:
            try:
                from exporter.client import UUYPClient

                config_result = UUYPClient.get_sms_up_sign_in_config(headers)
                config_data = ApiResponse.from_payload(config_result).data
                sms_up_content = str(config_data.get("SmsUpContent", "")).strip()
                sms_up_number = str(config_data.get("SmsUpNumber", "")).strip()
                _audit("auth.sms.up_config", sessionId=g.session_id, ok=bool(sms_up_content and sms_up_number))
            except Exception:
                logger.exception("[auth] fetch sms-up config failed")

        _audit("auth.sms.send", sessionId=g.session_id, phone=phone, code=code)

        return jsonify(
            {
                "status": "ok",
                "code": code,
                "message": msg,
                "requiresManualSms": code == 5050,
                "requestId": data.get("RequestId", ""),
                "smsUpContent": sms_up_content,
                "smsUpNumber": sms_up_number,
            }
        )

    @app.route("/api/auth/sms/verify", methods=["POST"])
    def auth_sms_verify():
        ok, reason = _check_same_origin()
        if not ok:
            return _error_response(reason, 403, code="invalid_origin")

        payload = request.get_json(silent=True) or {}
        phone = str(payload.get("phone", "")).strip()
        code_input = str(payload.get("code", "")).strip()

        if phone and not _is_valid_phone(phone):
            return _error_response("invalid phone format", 400, code="invalid_phone_format")
        if not _is_valid_sms_code(code_input):
            return _error_response("invalid sms code format", 400, code="invalid_sms_code_format")

        sms_ctx = g.session_record.data.get("sms", {})
        ctx_phone = str(sms_ctx.get("phone", "")).strip()
        if not ctx_phone:
            return _error_response("sms session not initialized", 400, code="sms_session_missing")
        if phone and phone != ctx_phone:
            return _error_response("phone mismatch", 400, code="phone_mismatch")

        limited = _check_rate_limit_both(
            "auth_sms_verify",
            RateLimitRule(max_requests=10, window_seconds=300),
            RateLimitRule(max_requests=6, window_seconds=300),
        )
        if limited:
            return limited

        try:
            from exporter.client import UUYPClient

            result = UUYPClient.sms_sign_in(
                ctx_phone,
                code_input,
                str(sms_ctx.get("deviceId", "")),
                sms_ctx.get("headers", {}),
                int(sms_ctx.get("regionCode", 86)),
            )
        except Exception:
            logger.exception("[auth] sms verify failed")
            return _error_response("sms login failed", 500, code="sms_login_failed")

        response = ApiResponse.from_payload(result)
        code = response.code
        data = response.data
        msg = response.message
        token = str(data.get("Token", "")).strip()

        if code != 0 or not token:
            return _error_response(msg, 400, code=code)

        app_type = "app"
        try:
            from exporter.client import UUYPClient

            client = UUYPClient(token=token, app_type=app_type)
            nickname = client.nickname
            user_id = client.user_id
        except Exception:
            nickname = ""
            user_id = ""

        g.session_record.data["auth"] = {
            "token": token,
            "appType": app_type,
            "nickname": nickname,
            "userId": user_id,
            "tokenRevealUsed": False,
            "createdAt": time.time(),
        }
        _audit("auth.sms.verify.success", sessionId=g.session_id, userId=user_id)

        return jsonify(
            {
                "status": "ok",
                "auth": {
                    "authenticated": True,
                    "nickname": nickname,
                    "userId": user_id,
                    "appType": app_type,
                },
            }
        )

    @app.route("/api/auth/pwd", methods=["POST"])
    def auth_pwd():
        limited = _check_rate_limit_both(
            "auth_pwd",
            RateLimitRule(max_requests=5, window_seconds=300),
            RateLimitRule(max_requests=3, window_seconds=300),
        )
        if limited:
            return limited

        ok, reason = _check_same_origin()
        if not ok:
            return _error_response(reason, 403, code="invalid_origin")

        payload = request.get_json(silent=True) or {}
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", "")).strip()
        if not username or not password:
            return _error_response(
                "username and password are required", 400, code="credentials_required"
            )
        if not _is_valid_phone(username):
            return _error_response("invalid username format", 400, code="invalid_username_format")
        if len(password) < 6 or len(password) > 128:
            return _error_response("invalid password format", 400, code="invalid_password_format")

        try:
            from exporter.client import UUYPClient

            result = UUYPClient.pwd_sign_in(username, password)
        except Exception:
            logger.exception("[auth] password sign in failed")
            return _error_response("password login failed", 500, code="password_login_failed")

        response = ApiResponse.from_payload(result)
        code = response.code
        data = response.data
        msg = response.message
        token = str(data.get("Token", "")).strip()
        if code != 0 or not token:
            return _error_response(msg, 400, code=code)

        app_type = "web"
        try:
            client = UUYPClient(token=token, app_type=app_type)
            nickname = client.nickname
            user_id = client.user_id
        except Exception:
            nickname = ""
            user_id = ""

        g.session_record.data["auth"] = {
            "token": token,
            "appType": app_type,
            "nickname": nickname,
            "userId": user_id,
            "tokenRevealUsed": False,
            "createdAt": time.time(),
        }
        g.session_record.data.pop("sms", None)
        _audit("auth.pwd.success", sessionId=g.session_id, userId=user_id)

        return jsonify(
            {
                "status": "ok",
                "auth": {
                    "authenticated": True,
                    "nickname": nickname,
                    "userId": user_id,
                    "appType": app_type,
                },
            }
        )

    @app.route("/api/auth/me")
    def auth_me():
        auth = g.session_record.data.get("auth")
        if not auth:
            return jsonify({"authenticated": False})
        token = str(auth.get("token", ""))
        token_masked = f"{token[:6]}***{token[-4:]}" if len(token) > 12 else "***"
        return jsonify(
            {
                "authenticated": True,
                "nickname": auth.get("nickname", ""),
                "userId": auth.get("userId", ""),
                "appType": auth.get("appType", "app"),
                "tokenMasked": token_masked,
                "tokenRevealUsed": bool(auth.get("tokenRevealUsed", False)),
            }
        )

    @app.route("/api/auth/token", methods=["GET"])
    def auth_token_reveal():
        """返回明文 Token（仅供用户点击复制时调用一次），严格限流 + 同源检查"""
        limited = _check_rate_limit_both(
            "auth_token_reveal",
            RateLimitRule(max_requests=10, window_seconds=60),
            RateLimitRule(max_requests=5, window_seconds=60),
        )
        if limited:
            return limited

        ok, reason = _check_same_origin()
        if not ok:
            return _error_response(reason, 403, code="invalid_origin")

        auth, err = _require_auth()
        if err:
            return err
        with token_reveal_lock:
            if auth.get("tokenRevealUsed"):
                return _error_response(
                    "token has already been revealed",
                    410,
                    code="token_already_revealed",
                )
            auth["tokenRevealUsed"] = True
            token = str(auth.get("token", ""))
        _audit("auth.token.reveal", sessionId=g.session_id)
        return jsonify({"status": "ok", "token": token})

    def _require_auth() -> tuple[dict | None, tuple | None]:
        auth = g.session_record.data.get("auth")
        if not auth or not str(auth.get("token", "")).strip():
            return None, _error_response("not authenticated", 401, code="not_authenticated")
        return auth, None

    def _progress_path(session_id: str) -> Path:
        return Path(artifacts.session_dir(session_id)) / "progress.json"

    def _write_progress(session_id: str, payload: dict) -> None:
        """原子写入进度文件（先写临时文件再替换，兼容多 worker 并发读）"""
        payload = {**payload, "updatedAt": time.time()}
        path = _progress_path(session_id)
        tmp = path.with_suffix(".json.tmp")
        try:
            tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            tmp.replace(path)
        except OSError:
            pass

    def _read_progress(session_id: str) -> dict | None:
        path = _progress_path(session_id)
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None

    def _run_fetch_pipeline(
        session_id: str,
        token: str,
        app_type: str,
        fetch_detail: bool,
        include_lease: bool,
        export_split: bool,
        lease_in_path: str | None,
    ) -> None:
        """后台线程执行导出管线，阶段性进度写入 progress.json"""
        stage_names = {"sell": "卖出订单", "buy": "买入订单", "lease": "租赁订单", "detail": "订单详情"}

        def on_progress(stage: str, page: int, count: int) -> None:
            _write_progress(
                session_id,
                {
                    "status": "running",
                    "stage": stage,
                    "stageName": stage_names.get(stage, stage),
                    "page": page,
                    "count": count,
                },
            )

        try:
            from exporter.client import UUYPClient
            from exporter.bill_exporter import BillExporter

            client = UUYPClient(token=token, app_type=app_type)
            output_dir = artifacts.session_dir(session_id)
            exporter = BillExporter(client, output_dir=str(output_dir))

            data = exporter.fetch_all_data(
                fetch_detail=fetch_detail,
                include_lease=include_lease,
                lease_in_api_path=lease_in_path,
                progress_callback=on_progress,
            )
            _write_progress(session_id, {"status": "running", "stage": "export", "stageName": "导出文件"})
            exporter.export_csv(data)
            if export_split:
                exporter.export_excel_ready_csv(data)
        except Exception:
            logger.exception("[fetch] export pipeline failed")
            _write_progress(session_id, {"status": "error", "message": "抓取失败，请重试"})
            return

        files = artifacts.list_csv_files(session_id)
        summary = {
            "sell": len(data.get("sell", [])),
            "buy": len(data.get("buy", [])),
            "lease": len(data.get("lease", [])),
        }
        _audit(
            "fetch.completed",
            sessionId=session_id,
            sell=summary["sell"],
            buy=summary["buy"],
            lease=summary["lease"],
            fileCount=len(files),
        )
        _write_progress(
            session_id,
            {"status": "done", "stage": "done", "stageName": "完成", "summary": summary, "fileCount": len(files)},
        )

    @app.route("/api/fetch/start", methods=["POST"])
    def fetch_start():
        limited = _check_rate_limit_both(
            "fetch_start",
            RateLimitRule(max_requests=2, window_seconds=300),
            RateLimitRule(max_requests=1, window_seconds=120),
        )
        if limited:
            return limited

        ok, reason = _check_same_origin()
        if not ok:
            return _error_response(reason, 403, code="invalid_origin")

        auth, err = _require_auth()
        if err:
            return err

        payload = request.get_json(silent=True) or {}
        fetch_detail = bool(payload.get("detail", False))
        include_lease = not bool(payload.get("noLease", False))
        export_split = bool(payload.get("exportSplit", False))
        lease_in_path = payload.get("leaseInPath")
        if lease_in_path is not None:
            lease_in_path = str(lease_in_path).strip() or None
            if lease_in_path and not lease_in_path.startswith("/api/"):
                return _error_response(
                    "leaseInPath must start with /api/",
                    400,
                    code="invalid_lease_path",
                )

        token = str(auth.get("token", "")).strip()
        app_type = str(auth.get("appType", "app") or "app")

        # 同一会话已有运行中的抓取任务时拒绝重复启动（10 分钟无心跳视为失效）
        existing = _read_progress(g.session_id)
        if (
            existing
            and existing.get("status") == "running"
            and time.time() - float(existing.get("updatedAt", 0)) < 600
        ):
            return _error_response("抓取任务正在进行中", 409, code="fetch_in_progress")

        _write_progress(
            g.session_id,
            {"status": "running", "stage": "init", "stageName": "准备中", "page": 0, "count": 0},
        )
        worker = threading.Thread(
            target=_run_fetch_pipeline,
            args=(
                g.session_id,
                token,
                app_type,
                fetch_detail,
                include_lease,
                export_split,
                lease_in_path,
            ),
            daemon=True,
        )
        worker.start()
        _audit("fetch.started", sessionId=g.session_id)
        return jsonify({"status": "started"}), 202

    @app.route("/api/fetch/progress")
    def fetch_progress():
        auth, err = _require_auth()
        if err:
            return err
        limited = _check_rate_limit(
            "fetch_progress", RateLimitRule(max_requests=120, window_seconds=60)
        )
        if limited:
            return limited
        progress = _read_progress(g.session_id)
        if not progress:
            return jsonify({"status": "idle"})
        if progress.get("status") == "done":
            progress = {**progress, "files": artifacts.list_csv_files(g.session_id)}
        return jsonify(progress)

    @app.route("/api/files")
    def api_files():
        auth_err = _require_auth()
        if auth_err[1]:
            return auth_err[1]
        limited = _check_rate_limit("api_files", RateLimitRule(max_requests=120, window_seconds=60))
        if limited:
            return limited
        return jsonify(artifacts.list_csv_files(g.session_id))

    @app.route("/api/csv/<filename>")
    def api_csv(filename: str):
        auth_err = _require_auth()
        if auth_err[1]:
            return auth_err[1]
        limited = _check_rate_limit("api_csv", RateLimitRule(max_requests=80, window_seconds=60))
        if limited:
            return limited

        target = artifacts.resolve_session_file(g.session_id, filename)
        if not target:
            abort(404)
        return send_file(str(target.resolve()), mimetype="text/plain; charset=utf-8")

    @app.route("/api/download-ticket", methods=["POST"])
    def create_download_ticket():
        auth_err = _require_auth()
        if auth_err[1]:
            return auth_err[1]
        limited = _check_rate_limit_both(
            "download_ticket",
            RateLimitRule(max_requests=40, window_seconds=60),
            RateLimitRule(max_requests=30, window_seconds=60),
        )
        if limited:
            return limited

        ok, reason = _check_same_origin()
        if not ok:
            return _error_response(reason, 403, code="invalid_origin")

        payload = request.get_json(silent=True) or {}
        filename = str(payload.get("filename", "")).strip()
        if not filename:
            return _error_response("filename is required", 400, code="filename_required")

        ttl = payload.get("ttlSeconds", 120)
        try:
            ttl = int(ttl)
        except (TypeError, ValueError):
            ttl = 120

        target = artifacts.resolve_session_file(g.session_id, filename)
        if not target:
            return _error_response("file not found", 404, code="file_not_found")

        token = tickets.create(g.session_id, target.name, ttl_seconds=ttl)
        _audit("download.ticket.created", sessionId=g.session_id, filename=target.name, ticket=token)
        return jsonify(
            {
                "status": "ok",
                "ticket": token,
                "downloadUrl": f"/api/download/{token}",
            }
        )

    @app.route("/api/download/<ticket>", methods=["GET", "HEAD"])
    def consume_download_ticket(ticket: str):
        limited = _check_rate_limit("download_consume", RateLimitRule(max_requests=60, window_seconds=60))
        if limited:
            return limited

        # 浏览器导航通常会携带会话 Cookie；手机系统下载器可能只拿到 URL，
        # 因此 Cookie 只在存在时用于校验，票据本身保存的会话用于定位文件。
        cookie_session_id = request.cookies.get(cfg.session_cookie_name)
        if request.method == "HEAD":
            download_ticket = tickets.peek(ticket, cookie_session_id)
        else:
            download_ticket = tickets.consume(ticket, cookie_session_id)
        if not download_ticket:
            return _error_response("ticket invalid or expired", 404, code="ticket_invalid")

        target = artifacts.resolve_session_file(download_ticket.session_id, download_ticket.filename)
        if not target:
            return _error_response("file not found", 404, code="file_not_found")

        if request.method == "GET":
            _audit("download.ticket.consumed", sessionId=download_ticket.session_id, filename=target.name)

        return send_file(str(target.resolve()), as_attachment=True, download_name=target.name)

    @app.route("/api/upload-csv", methods=["POST"])
    def upload_csv():
        auth_err = _require_auth()
        if auth_err[1]:
            return auth_err[1]
        limited = _check_rate_limit_both(
            "upload_csv",
            RateLimitRule(max_requests=20, window_seconds=300),
            RateLimitRule(max_requests=12, window_seconds=300),
        )
        if limited:
            return limited

        ok, reason = _check_same_origin()
        if not ok:
            return _error_response(reason, 403, code="invalid_origin")

        files = request.files.getlist("files")
        if not files:
            return _error_response("no files uploaded", 400, code="files_required")
        if len(files) > MAX_UPLOAD_FILES:
            return _error_response(
                f"too many files (max {MAX_UPLOAD_FILES})",
                400,
                code="too_many_files",
            )

        session_dir = artifacts.session_dir(g.session_id)
        saved_names: list[str] = []

        for upload in files:
            original_name = (upload.filename or "").strip()
            if not original_name:
                return _error_response("invalid filename", 400, code="invalid_filename")

            safe_name = Path(original_name).name
            if not safe_name.lower().endswith(".csv"):
                return _error_response(
                    f"invalid file type: {safe_name}",
                    400,
                    code="invalid_file_type",
                )

            sample = upload.stream.read(MAX_UPLOAD_FILE_SIZE + 1)
            upload.stream.seek(0)
            if len(sample) > MAX_UPLOAD_FILE_SIZE:
                return _error_response(
                    f"file too large: {safe_name}",
                    400,
                    code="file_too_large",
                )
            if not _looks_like_csv(sample[:4096]):
                return _error_response(
                    f"invalid csv header: {safe_name}",
                    400,
                    code="invalid_csv_header",
                )

            suffix = Path(safe_name).suffix
            stem = Path(safe_name).stem
            stored_name = f"upload_{int(time.time())}_{uuid.uuid4().hex[:8]}_{stem}{suffix}"
            target = session_dir / stored_name

            upload.save(target)
            saved_names.append(stored_name)

        files_payload = artifacts.list_csv_files(g.session_id)
        _audit("upload.completed", sessionId=g.session_id, uploaded=len(saved_names), totalFiles=len(files_payload))
        return jsonify({"status": "ok", "saved": saved_names, "files": files_payload})

    return app
