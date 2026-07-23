# UUYP Trade Analyzer

English | [中文](README_CN.md)

A self-hosted web service that exports and analyzes your trading history (buy / sell / lease) from [悠悠有品 (UUYP / youpin898.com)](https://www.youpin898.com), a CS2 skin trading platform in China.

UUYP does not offer any official bill export feature (CSV / Excel / PDF). This project calls UUYP's mobile APP API to fetch all trade orders automatically, exports them as CSV files, and provides a visual profit/loss analysis dashboard.

## Features

- **Multiple login methods** — Bearer token import, SMS verification code, or account password
- **Full data fetching** — Paginated fetching of buy, sell, lease-out and lease-in orders, with automatic retry and risk-control backoff
- **CSV export** — One combined sheet plus optional per-type sheets (buy / sell / lease)
- **Visual analysis** — FIFO profit/loss matching, wear-level analysis, weapon-type analysis, and time-trend charts
- **Multi-user concurrency** — Stateless session design with in-memory isolation; supports multiple users simultaneously
- **Security** — Two-layer rate limiting, one-time download tickets, log redaction, HttpOnly + SameSite cookies
- **One-command Docker deployment**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, Flask 3, requests, gunicorn |
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, Radix UI, Recharts |
| CSV Parsing | PapaParse (browser-side) |
| Package Manager | uv (Python), npm (frontend) |
| Deploy | Docker, GitHub Actions → ghcr.io |

## Usage Options

- **Self-host locally (recommended)** — Run it on your own machine or home server. A residential IP is not affected by UUYP's data-center risk control, so all login methods (auto-SMS, password, token) work out of the box.
- **Public VPS deployment** — Data-center IPs (Alibaba Cloud, Tencent Cloud, etc.) are flagged on the SMS endpoint: auto-SMS degrades to manual SMS (code 5050, verified working), and token login always works. See [IP Risk Control](#ip-risk-control--compliance-first-strategy) for details.

## Quick Start

Prerequisites: Python 3.11+ with [uv](https://docs.astral.sh/uv/), Node.js 22+.

```bash
# 1. Build the frontend (outputs to static/)
npm install
npm run build

# 2. Install backend dependencies
uv sync

# 3. Start the server
uv run python app.py
# Open http://localhost:8765
```

CLI options:

```bash
python app.py --port 8080 --host 127.0.0.1
```

> The Flask server hosts the built frontend from `static/`. If you skip step 1, the UI will be missing or outdated. For frontend development workflow (vite dev, lint, etc.), see [docs/development.md](docs/development.md).

## Docker

```bash
docker build -t uuyp-trade-analyzer .
docker run -d -p 8765:8765 uuyp-trade-analyzer
```

### GitHub Container Registry

Pushing to `main` triggers an automatic build (backend pytest + frontend vitest + image build):

```bash
docker pull ghcr.io/youki258/uuyp-trade-analyzer:latest
```

## API Endpoints

### Session

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Server status + session TTL |
| GET | `/api/session/info` | Current session info |
| POST | `/api/session/destroy` | Destroy session |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/token` | Bearer token login |
| POST | `/api/auth/sms/send` | Send SMS code |
| POST | `/api/auth/sms/verify` | Verify SMS code + login |
| POST | `/api/auth/pwd` | Password login |
| GET | `/api/auth/me` | Current auth status |

### Data

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/fetch/start` | Trigger full data fetch + CSV export |
| GET | `/api/files` | List session CSV files |
| GET | `/api/csv/<filename>` | Read CSV content |
| POST | `/api/upload-csv` | Upload external CSV (max 10MB, max 8 files) |
| POST | `/api/download-ticket` | Create one-time download token |
| GET | `/api/download/<ticket>` | Consume token and download |

## Environment Variables

All variables are optional. "Code default" applies when the variable is unset; the Docker image presets its own values via `ENV` (see Dockerfile).

| Variable | Code default | Docker preset | Description |
|----------|--------------|---------------|-------------|
| `UUYP_SESSION_COOKIE_NAME` | `uuyp_sid` | `uuyp_sid` | Session cookie name |
| `UUYP_SESSION_TTL_SECONDS` | `3600` | `3600` | Session TTL in seconds (min 60) |
| `UUYP_SESSION_MAX_COUNT` | `100` | `100` | Max concurrent sessions (min 100) |
| `UUYP_CLEANUP_INTERVAL_SECONDS` | `300` | `300` | Expired session cleanup interval (min 5) |
| `UUYP_ARTIFACT_TTL_SECONDS` | = session TTL | `1800` | Temp file retention in seconds (min 120) |
| `UUYP_COOKIE_SECURE` | `false` | `true` | Cookie Secure flag (set `true` behind HTTPS) |
| `UUYP_COOKIE_SAMESITE` | `Strict` | `Strict` | Cookie SameSite policy (`Strict` / `Lax` / `None`) |

See [.env.example](.env.example) for a commented template. An optional `UUYP_PROXY_URL` variable exists for the opt-in proxy escape hatch — see [IP Risk Control](#ip-risk-control--compliance-first-strategy) below.

## Project Structure

```
├── app.py                    # Entry point, CLI args, starts Flask
├── server/                   # Flask stateless backend
│   ├── app.py                # Routes and core logic
│   ├── config.py             # Environment config
│   ├── session_store.py      # In-memory session management
│   ├── storage.py            # Temp file storage (per-session)
│   ├── download_tickets.py   # One-time download tokens
│   └── rate_limit.py         # In-memory rate limiter
├── exporter/                 # UUYP API client
│   ├── client.py             # Auth + order fetching (with uk verification)
│   └── bill_exporter.py      # Full pagination fetch + CSV export
├── src/                      # React frontend source
│   ├── pages/                # Dashboard, ProfitAnalysis, Trend, CS2Analysis, TradeDetail, Login
│   ├── components/           # Charts, tables, upload panels, auth, layout
│   ├── hooks/                # React hooks
│   ├── utils/                # CSV parser, FIFO matcher, CS2 analyzer
│   └── types/                # TypeScript type definitions
├── tests/                    # Backend pytest suite
├── static/                   # Vite build output (served by Flask)
├── docs/                     # Documentation
├── .github/workflows/        # CI: test + build + push to ghcr.io
├── .env.example              # Environment variable template
├── Dockerfile
├── pyproject.toml
└── vite.config.ts
```

## Architecture

- **Stateless** — No external database. Sessions and files live in memory + temp directory. Restart = clean slate.
- **Session isolation** — Each browser gets its own session via cookie, with auto-expiry and cleanup.
- **Auth proxy** — The backend proxies all UUYP API calls; user credentials never touch the frontend.
- **Client-side analysis** — All profit/loss computation (FIFO matching, charts) runs in the browser. The backend only fetches and serves data.
- **uk device verification** — The client obtains a `uk` token from `/api/app` on init to reduce rate-limiting risk.

## Testing

```bash
# Backend (tests/)
uv run pytest tests/ -v

# Frontend (src/**/*.test.ts)
npx vitest run
```

Both suites run in CI on every push to `main`.

## IP Risk Control & Compliance-First Strategy

When this service is deployed in a data center (cloud VPS), its IP ASN (e.g., Alibaba Cloud AS37963) is flagged by UUYP on the `SendSignInSmsCode` endpoint. Verified on 2026-07-23: the risk control **degrades auto-SMS to manual verification (code 5050) rather than rejecting the request outright** — earlier SOCKS5 experiments failed 100% because a proxy cannot change this. See [IP risk control research](docs/ip_risk_control_research.md) for the full analysis.

**Recommended login methods by scenario:**

- **Self-hosted on a residential network** — all methods work: auto-SMS, password, or token. No risk control applies.
- **Public VPS (data-center IP)** —
  1. **Manual SMS (5050)** — verified working from data-center IPs: when the server returns code 5050, the page displays the exact SMS text and recipient number (fetched from UUYP's config API — no official APP needed); send it from your own phone, then log in with the code field left empty
  2. **Paste token** — zero IP risk, but acquiring a token requires APP traffic capture, so it suits advanced users only
  3. *Optional* **Residential/mobile proxy for auto-SMS** — requires `UUYP_PROXY_URL` plus TLS fingerprint spoofing (`curl_cffi`); disabled by default, see the [design doc](docs/ip_risk_control_design.md)

Once logged in, data fetching (token + `uk` device verification + rate limiting) works normally from data-center IPs and is not affected by the above risk control.

## Documentation

- [Development Guide](docs/development.md) — 分支策略、提交规范、测试、CI/CD、安全编码标准
- [Deployment Guide](docs/deployment.md) — Docker 部署、VPS 配置、镜像加速、监控、回滚
- [API Research](docs/api_research.md) — 悠悠有品 API 逆向研究报告
- [IP Risk Control Research](docs/ip_risk_control_research.md) — 业界 IP 风控与绕过实践全景分析
- [IP Risk Control Design](docs/ip_risk_control_design.md) — 合规优先策略下的改造方案设计（可选代理逃生舱）

## Acknowledgments

This project builds on prior reverse-engineering work by the community. API-related credits:

- **UUYP unofficial private API** (`api.youpin898.com`) — endpoints reverse-engineered from the Android APP (v5.46.1). See [docs/api_research.md](docs/api_research.md) for the research notes.
- **[Steamauto](https://github.com/Steamauto/Steamauto)** (`uuyoupinapi` module) — reference for the login flow, buy/sell/lease-out order endpoints, and pagination parameters (`page_size=50`).
- **[cs2-trade-manager](https://github.com/cs2trading/cs2-trade-manager)** — reference for the `uk` device-verification implementation.

Also thanks to the open-source projects this service depends on, including React, Flask, Recharts, PapaParse, Radix UI, and Tailwind CSS.

## Related Projects

- Desktop version (PyInstaller): [cs2-youpin-trade-analyzer](https://github.com/youki258/cs2-youpin-trade-analyzer)

## Disclaimer

本项目仅供学习交流使用，与悠悠有品官方无任何关联。调用非官方 API 存在风控风险，请自行评估。

This project is for educational purposes only and is not affiliated with UUYP. Using unofficial APIs carries risk of account restrictions.

## License

[MIT](LICENSE)

## Keywords

悠悠有品, UUYP, youpin898, CS2, CSGO, 饰品交易, 账单导出, 盈亏分析, bill export, trade analyzer, profit loss, skin trading, CSV export, 租赁, lease, FIFO
