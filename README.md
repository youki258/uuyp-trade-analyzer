# UUYP Trade Analyzer

悠悠有品 CS2 交易账单导出与盈亏分析 Web 服务。

A self-hosted web service that exports and analyzes your trading history (buy / sell / lease) from [悠悠有品 (UUYP / youpin898.com)](https://www.youpin898.com), a CS2 skin trading platform in China.

## Why

悠悠有品不提供任何官方账单导出功能（CSV / Excel / PDF 均无）。本项目通过调用悠悠有品 APP 端接口，自动抓取全部交易记录，导出 CSV，并提供可视化盈亏分析面板。

UUYP does not offer any official bill export feature. This project automates the process by calling UUYP's mobile APP API to fetch all trade orders, export them as CSV, and provide a visual profit/loss analysis dashboard.

## Features

- **多种登录方式** — Token 导入 / 短信验证码 / 账号密码
- **全量数据抓取** — 买入、卖出、租出、租入订单分页抓取，自动重试与风控退避
- **CSV 导出** — 总表 + 可选分表（买入/卖出/租赁）
- **可视化分析** — FIFO 盈亏匹配、磨损等级分析、武器类型分析、时间趋势图
- **多用户并发** — 无状态会话设计，内存隔离，支持多人同时使用
- **安全机制** — 双层限流、一次性下载令牌、日志脱敏、Cookie HttpOnly + SameSite
- **Docker 一键部署**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, Flask 3, requests |
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, Radix UI, Recharts |
| CSV Parsing | PapaParse (browser-side) |
| Package Manager | uv (Python), npm (frontend) |
| Deploy | Docker, GitHub Actions → ghcr.io |

## Quick Start

```bash
# Install dependencies
uv sync

# Start server
uv run python app.py
# Open http://localhost:8765
```

CLI options:

```bash
python app.py --port 8080 --host 127.0.0.1
```

## Docker

```bash
docker build -t uuyp-trade-analyzer .
docker run -d -p 8765:8765 uuyp-trade-analyzer
```

### GitHub Container Registry

Push to `main` triggers automatic build:

```bash
docker pull ghcr.io/<owner>/uuyp-trade-analyzer:latest
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
| POST | `/api/auth/token` | Bearer Token login |
| POST | `/api/auth/sms/send` | Send SMS code |
| POST | `/api/auth/sms/verify` | Verify SMS + login |
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

| Variable | Default | Description |
|----------|---------|-------------|
| `UUYP_SESSION_COOKIE_NAME` | `uuyp_sid` | Session cookie name |
| `UUYP_SESSION_TTL_SECONDS` | `3600` | Session TTL (seconds) |
| `UUYP_SESSION_MAX_COUNT` | `100` | Max concurrent sessions |
| `UUYP_CLEANUP_INTERVAL_SECONDS` | `300` | Expired session cleanup interval |
| `UUYP_ARTIFACT_TTL_SECONDS` | `1800` | Temp file retention |
| `UUYP_COOKIE_SECURE` | `false` | Cookie Secure flag (set `true` for HTTPS) |
| `UUYP_COOKIE_SAMESITE` | `Strict` | Cookie SameSite policy |

## Project Structure

```
├── app.py                    # Entry point, CLI args, start Flask
├── server/                   # Flask stateless service
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
│   ├── pages/                # Dashboard, ProfitAnalysis, Trend, CS2Analysis, TradeDetail
│   ├── components/           # Charts, tables, upload panels
│   ├── utils/                # CSV parser, FIFO matcher, CS2 analyzer
│   └── types/                # TypeScript type definitions
├── static/                   # Vite build output
├── docs/                     # Documentation
├── Dockerfile
├── pyproject.toml
└── vite.config.ts
```

## Architecture

- **Stateless** — No external database. Sessions and files live in memory + temp directory. Restart = clean slate.
- **Session isolation** — Each browser gets its own session via Cookie. Auto-expiry and cleanup.
- **Auth proxy** — Backend proxies all UUYP API calls. User credentials never touch the frontend.
- **Client-side analysis** — All profit/loss computation (FIFO matching, charts) runs in the browser. Backend only fetches and serves data.
- **uk device verification** — Client obtains a `uk` token from `/api/app` on init to reduce rate-limiting risk.

## Related Projects

- Desktop version (PyInstaller): [cs2-youpin-trade-analyzer](https://github.com/youki258/cs2-youpin-trade-analyzer)
- API reference: [Steamauto](https://github.com/Steamauto/Steamauto) (uuyoupinapi module)

## Keywords

悠悠有品, UUYP, youpin898, CS2, CSGO, 饰品交易, 账单导出, 盈亏分析, bill export, trade analyzer, profit loss, skin trading, CSV export, 租赁, lease, FIFO

## Disclaimer

本项目仅供学习交流使用，与悠悠有品官方无任何关联。调用非官方 API 存在风控风险，请自行评估。

This project is for educational purposes only and is not affiliated with UUYP. Using unofficial APIs carries risk of account restrictions.

## License

MIT
