import time
import re
import uuid
import json
from pathlib import Path

from flask import Flask, abort, g, jsonify, request, send_file, send_from_directory

from .config import load_config
from .download_tickets import OneTimeDownloadTicketStore
from .rate_limit import InMemoryRateLimiter, RateLimitRule
from .session_store import InMemorySessionStore
from .storage import SessionArtifactStore


def _normalize_code(payload: dict) -> int:
    code = payload.get("Code", payload.get("code", -1))
    try:
        return int(code)
    except (TypeError, ValueError):
        return -1


def _normalize_data(payload: dict) -> dict:
    data = payload.get("Data", payload.get("data", {}))
    return data if isinstance(data, dict) else {}


def _normalize_msg(payload: dict) -> str:
    msg = payload.get("Msg", payload.get("msg", ""))
    if isinstance(msg, str) and msg.strip():
        return msg.strip()
    return "请求失败"


def _is_valid_phone(value: str) -> bool:
    return bool(re.fullmatch(r"\d{6,20}", value))


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
        return True, ""
    host_url = request.host_url.rstrip("/")
    if origin.rstrip("/") != host_url:
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
    sanitized = {}
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
    print(f"[audit] {json.dumps(payload, ensure_ascii=False)}")


def create_stateless_app(dist_dir: Path) -> Flask:
    """创建无状态临时服务应用。

    当前阶段仅提供静态页面和状态接口，后续步骤会逐步加入会话、上传、抓取和下载链路。
    """
    app = Flask(__name__, static_folder=None)
    cfg = load_config()
    sessions = InMemorySessionStore(cfg.session_ttl_seconds, cfg.max_sessions)
    rate_limiter = InMemoryRateLimiter()
    artifacts = SessionArtifactStore()
    tickets = OneTimeDownloadTicketStore()
    last_cleanup_at = 0.0

    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SECURE"] = cfg.cookie_secure
    app.config["SESSION_COOKIE_SAMESITE"] = cfg.cookie_samesite

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
                return jsonify({"status": "error", "message": "server busy"}), 503
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
            return jsonify({"status": "error", "message": "too many requests"}), 429
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
            return jsonify({"status": "error", "message": reason}), 403

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
            return jsonify({"status": "error", "message": reason}), 403

        payload = request.get_json(silent=True) or {}
        token = str(payload.get("token", "")).strip()
        app_type = str(payload.get("appType", "app")).strip() or "app"
        if app_type not in {"app", "web"}:
            app_type = "app"

        if not token:
            return jsonify({"status": "error", "message": "token is required"}), 400
        if len(token) < 20 or len(token) > 4096:
            return jsonify({"status": "error", "message": "invalid token format"}), 400

        try:
            from exporter.client import UUYPClient

            client = UUYPClient(token=token, app_type=app_type)
        except Exception:
            print("[auth] token verify failed")
            return jsonify({"status": "error", "message": "token invalid"}), 400

        g.session_record.data["auth"] = {
            "token": token,
            "appType": app_type,
            "nickname": client.nickname,
            "userId": client.user_id,
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
        limited = _check_rate_limit_both(
            "auth_sms_send",
            RateLimitRule(max_requests=3, window_seconds=300),
            RateLimitRule(max_requests=2, window_seconds=300),
        )
        if limited:
            return limited

        ok, reason = _check_same_origin()
        if not ok:
            return jsonify({"status": "error", "message": reason}), 403

        payload = request.get_json(silent=True) or {}
        phone = str(payload.get("phone", "")).strip()
        region_code = payload.get("regionCode", 86)

        if not phone:
            return jsonify({"status": "error", "message": "phone is required"}), 400
        if not _is_valid_phone(phone):
            return jsonify({"status": "error", "message": "invalid phone format"}), 400

        try:
            region_code = int(region_code)
        except (TypeError, ValueError):
            region_code = 86

        try:
            from exporter.client import UUYPClient

            result, device_info, headers = UUYPClient.send_sms_code(phone, region_code)
        except Exception:
            print("[auth] send sms failed")
            return jsonify({"status": "error", "message": "send sms failed"}), 500

        code = _normalize_code(result)
        data = _normalize_data(result)
        msg = _normalize_msg(result)

        if code not in {0, 5050}:
            return jsonify({"status": "error", "code": code, "message": msg}), 400

        g.session_record.data["sms"] = {
            "phone": phone,
            "regionCode": region_code,
            "deviceId": device_info.get("deviceId", ""),
            "headers": headers,
            "createdAt": time.time(),
        }
        _audit("auth.sms.send", sessionId=g.session_id, phone=phone, code=code)

        return jsonify(
            {
                "status": "ok",
                "code": code,
                "message": msg,
                "requiresManualSms": code == 5050,
                "requestId": data.get("RequestId", ""),
            }
        )

    @app.route("/api/auth/sms/verify", methods=["POST"])
    def auth_sms_verify():
        limited = _check_rate_limit_both(
            "auth_sms_verify",
            RateLimitRule(max_requests=10, window_seconds=300),
            RateLimitRule(max_requests=6, window_seconds=300),
        )
        if limited:
            return limited

        ok, reason = _check_same_origin()
        if not ok:
            return jsonify({"status": "error", "message": reason}), 403

        payload = request.get_json(silent=True) or {}
        phone = str(payload.get("phone", "")).strip()
        code_input = str(payload.get("code", "")).strip()

        if phone and not _is_valid_phone(phone):
            return jsonify({"status": "error", "message": "invalid phone format"}), 400
        if not _is_valid_sms_code(code_input):
            return jsonify({"status": "error", "message": "invalid sms code format"}), 400

        sms_ctx = g.session_record.data.get("sms", {})
        ctx_phone = str(sms_ctx.get("phone", "")).strip()
        if not ctx_phone:
            return jsonify({"status": "error", "message": "sms session not initialized"}), 400
        if phone and phone != ctx_phone:
            return jsonify({"status": "error", "message": "phone mismatch"}), 400

        try:
            from exporter.client import UUYPClient

            result = UUYPClient.sms_sign_in(
                ctx_phone,
                code_input,
                str(sms_ctx.get("deviceId", "")),
                sms_ctx.get("headers", {}),
            )
        except Exception:
            print("[auth] sms verify failed")
            return jsonify({"status": "error", "message": "sms login failed"}), 500

        code = _normalize_code(result)
        data = _normalize_data(result)
        msg = _normalize_msg(result)
        token = str(data.get("Token", "")).strip()

        if code != 0 or not token:
            return jsonify({"status": "error", "code": code, "message": msg}), 400

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
            return jsonify({"status": "error", "message": reason}), 403

        payload = request.get_json(silent=True) or {}
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", "")).strip()
        if not username or not password:
            return jsonify({"status": "error", "message": "username and password are required"}), 400
        if not _is_valid_phone(username):
            return jsonify({"status": "error", "message": "invalid username format"}), 400
        if len(password) < 6 or len(password) > 128:
            return jsonify({"status": "error", "message": "invalid password format"}), 400

        try:
            from exporter.client import UUYPClient

            result = UUYPClient.pwd_sign_in(username, password)
        except Exception:
            print("[auth] password sign in failed")
            return jsonify({"status": "error", "message": "password login failed"}), 500

        code = _normalize_code(result)
        data = _normalize_data(result)
        msg = _normalize_msg(result)
        token = str(data.get("Token", "")).strip()
        if code != 0 or not token:
            return jsonify({"status": "error", "code": code, "message": msg}), 400

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
        return jsonify(
            {
                "authenticated": True,
                "nickname": auth.get("nickname", ""),
                "userId": auth.get("userId", ""),
                "appType": auth.get("appType", "app"),
            }
        )

    def _require_auth() -> tuple[dict | None, tuple | None]:
        auth = g.session_record.data.get("auth")
        if not auth or not str(auth.get("token", "")).strip():
            return None, (jsonify({"status": "error", "message": "not authenticated"}), 401)
        return auth, None

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
            return jsonify({"status": "error", "message": reason}), 403

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
                return jsonify({"status": "error", "message": "leaseInPath must start with /api/"}), 400

        token = str(auth.get("token", "")).strip()
        app_type = str(auth.get("appType", "app") or "app")

        try:
            from exporter.client import UUYPClient
            from exporter.bill_exporter import BillExporter

            client = UUYPClient(token=token, app_type=app_type)
            output_dir = artifacts.session_dir(g.session_id)
            exporter = BillExporter(client, output_dir=str(output_dir))

            data = exporter.fetch_all_data(
                fetch_detail=fetch_detail,
                include_lease=include_lease,
                lease_in_api_path=lease_in_path,
            )
            exporter.export_csv(data)
            if export_split:
                exporter.export_excel_ready_csv(data)
        except Exception:
            print("[fetch] export pipeline failed")
            return jsonify({"status": "error", "message": "fetch failed"}), 500

        files = artifacts.list_csv_files(g.session_id)
        _audit(
            "fetch.completed",
            sessionId=g.session_id,
            sell=len(data.get("sell", [])),
            buy=len(data.get("buy", [])),
            lease=len(data.get("lease", [])),
            fileCount=len(files),
        )
        return jsonify(
            {
                "status": "ok",
                "summary": {
                    "sell": len(data.get("sell", [])),
                    "buy": len(data.get("buy", [])),
                    "lease": len(data.get("lease", [])),
                },
                "files": files,
            }
        )

    @app.route("/api/files")
    def api_files():
        limited = _check_rate_limit("api_files", RateLimitRule(max_requests=120, window_seconds=60))
        if limited:
            return limited
        return jsonify(artifacts.list_csv_files(g.session_id))

    @app.route("/api/csv/<filename>")
    def api_csv(filename: str):
        limited = _check_rate_limit("api_csv", RateLimitRule(max_requests=80, window_seconds=60))
        if limited:
            return limited

        target = artifacts.resolve_session_file(g.session_id, filename)
        if not target:
            abort(404)
        return send_file(str(target.resolve()), mimetype="text/plain; charset=utf-8")

    @app.route("/api/download-ticket", methods=["POST"])
    def create_download_ticket():
        limited = _check_rate_limit_both(
            "download_ticket",
            RateLimitRule(max_requests=40, window_seconds=60),
            RateLimitRule(max_requests=30, window_seconds=60),
        )
        if limited:
            return limited

        ok, reason = _check_same_origin()
        if not ok:
            return jsonify({"status": "error", "message": reason}), 403

        payload = request.get_json(silent=True) or {}
        filename = str(payload.get("filename", "")).strip()
        if not filename:
            return jsonify({"status": "error", "message": "filename is required"}), 400

        ttl = payload.get("ttlSeconds", 120)
        try:
            ttl = int(ttl)
        except (TypeError, ValueError):
            ttl = 120

        target = artifacts.resolve_session_file(g.session_id, filename)
        if not target:
            return jsonify({"status": "error", "message": "file not found"}), 404

        token = tickets.create(g.session_id, target.name, ttl_seconds=ttl)
        _audit("download.ticket.created", sessionId=g.session_id, filename=target.name, ticket=token)
        return jsonify(
            {
                "status": "ok",
                "ticket": token,
                "downloadUrl": f"/api/download/{token}",
            }
        )

    @app.route("/api/download/<ticket>")
    def consume_download_ticket(ticket: str):
        limited = _check_rate_limit("download_consume", RateLimitRule(max_requests=60, window_seconds=60))
        if limited:
            return limited

        filename = tickets.consume(ticket, g.session_id)
        if not filename:
            return jsonify({"status": "error", "message": "ticket invalid or expired"}), 404

        target = artifacts.resolve_session_file(g.session_id, filename)
        if not target:
            return jsonify({"status": "error", "message": "file not found"}), 404

        _audit("download.ticket.consumed", sessionId=g.session_id, filename=target.name)

        return send_file(str(target.resolve()), as_attachment=True, download_name=target.name)

    @app.route("/api/upload-csv", methods=["POST"])
    def upload_csv():
        limited = _check_rate_limit_both(
            "upload_csv",
            RateLimitRule(max_requests=20, window_seconds=300),
            RateLimitRule(max_requests=12, window_seconds=300),
        )
        if limited:
            return limited

        ok, reason = _check_same_origin()
        if not ok:
            return jsonify({"status": "error", "message": reason}), 403

        files = request.files.getlist("files")
        if not files:
            return jsonify({"status": "error", "message": "no files uploaded"}), 400
        if len(files) > MAX_UPLOAD_FILES:
            return jsonify({"status": "error", "message": f"too many files (max {MAX_UPLOAD_FILES})"}), 400

        session_dir = artifacts.session_dir(g.session_id)
        saved_names: list[str] = []

        for upload in files:
            original_name = (upload.filename or "").strip()
            if not original_name:
                return jsonify({"status": "error", "message": "invalid filename"}), 400

            safe_name = Path(original_name).name
            if not safe_name.lower().endswith(".csv"):
                return jsonify({"status": "error", "message": f"invalid file type: {safe_name}"}), 400

            sample = upload.stream.read(MAX_UPLOAD_FILE_SIZE + 1)
            upload.stream.seek(0)
            if len(sample) > MAX_UPLOAD_FILE_SIZE:
                return jsonify({"status": "error", "message": f"file too large: {safe_name}"}), 400
            if not _looks_like_csv(sample[:4096]):
                return jsonify({"status": "error", "message": f"invalid csv header: {safe_name}"}), 400

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
