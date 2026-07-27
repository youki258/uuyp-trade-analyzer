<div align="center">

<h1>UUYP Trade Analyzer</h1>
<p><strong>Export and analyze your CS2 skin trading history from 悠悠有品 — zero setup needed.</strong></p>

<img src="https://img.shields.io/github/stars/youki258/uuyp-trade-analyzer?style=flat" alt="Stars">
<img src="https://img.shields.io/github/license/youki258/uuyp-trade-analyzer?style=flat" alt="License">
<img src="https://img.shields.io/github/actions/workflow/status/youki258/uuyp-trade-analyzer/deploy.yml?style=flat" alt="CI">
<img src="https://img.shields.io/github/last-commit/youki258/uuyp-trade-analyzer?style=flat" alt="Last Commit">

<img src="https://img.shields.io/badge/Python-3.11+-blue?style=flat" alt="Python">
<img src="https://img.shields.io/badge/Flask-3-000?style=flat&logo=flask&logoColor=white" alt="Flask">
<img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white" alt="React">
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite">
<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
<img src="https://img.shields.io/badge/Recharts-22B5BF?style=flat" alt="Recharts">

[English](README_EN.md) · [中文](README.md)

</div>

UUYP does not offer any official CSV or Excel export. This project calls UUYP's mobile API to automatically fetch all your trade orders, exports them as CSV, and visualizes profit/loss through an interactive dashboard.

---

## Try It Now

**👉 [https://youki.me](https://youki.me)** — hosted service, ready to use. No registration, no installation. Open it in your browser and start fetching.

<sub>Your session is isolated and temporary. Nothing is stored on the server.</sub>

### Run Locally

Prerequisites: Python 3.11+ with [uv](https://docs.astral.sh/uv/), Node.js 22+.

```bash
# 1. Build the frontend
cd frontend && npm install && npm run build

# 2. Install backend dependencies
cd ../backend && uv sync

# 3. Start the server
uv run python app.py
```

Open http://localhost:8765.

---

## Features

- 🔑 **Multiple login methods** — Bearer token, SMS verification code, or account password
- 📥 **Full data fetch** — Paginated buy, sell, lease-in, lease-out orders with auto-retry
- 📄 **CSV export** — Combined sheet or per-type exports, one-click download
- 📊 **Visual analysis** — FIFO profit/loss matching, wear-level breakdown, weapon-type distribution, time trends
- 🛡 **Security** — Two-layer rate limiting, one-time download tickets, log redaction

<div align="center">
  <img src="docs/images/dashboard.png" alt="Dashboard screenshot" width="800">
  <br><sub>Dashboard — real-time trade overview and profit/loss summary.</sub>
</div>

---

## Notes

VPS users (Alibaba Cloud, Tencent Cloud, etc.) may encounter SMS risk control (code 5050) — token login always works. See [IP Risk Control](docs/ip_risk_control_research.md) for details.

This project is for educational purposes only and is not affiliated with 悠悠有品. Using unofficial APIs carries risk of account restrictions.

---

## License

[MIT](LICENSE)