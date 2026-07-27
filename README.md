<div align="center">

<h1>UUYP Trade Analyzer（悠悠有品交易分析器）</h1>
<p><strong>导出并分析你的悠悠有品 CS2 饰品交易记录 — 无需安装，打开即用。</strong></p>

[![Stars](https://img.shields.io/github/stars/youki258/uuyp-trade-analyzer?style=flat-square&labelColor=0D1117&color=7B61FF)](https://github.com/youki258/uuyp-trade-analyzer/stargazers)
[![License](https://img.shields.io/github/license/youki258/uuyp-trade-analyzer?style=flat-square&labelColor=0D1117&color=7B61FF)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-0D1117?style=flat-square&labelColor=0D1117&color=7B61FF)](https://www.python.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/youki258/uuyp-trade-analyzer/deploy.yml?style=flat-square&labelColor=0D1117&color=7B61FF)](https://github.com/youki258/uuyp-trade-analyzer/actions)

[English](README_EN.md) · [中文](README.md)

</div>

悠悠有品不提供任何官方账单导出功能（CSV / Excel / PDF 均无）。本项目通过调用悠悠有品 APP 端接口，自动抓取全部交易记录，导出 CSV，并提供可视化盈亏分析面板。

---

## 立即使用

**👉 [https://youki.me](https://youki.me)** — 在线服务，打开浏览器就能用。无需注册，无需部署。

<sub>会话隔离且临时，服务端不保存任何数据。</sub>

### 本地部署

前置要求：Python 3.11+ 与 [uv](https://docs.astral.sh/uv/)、Node.js 22+。

```bash
# 1. 构建前端
cd frontend && npm install && npm run build

# 2. 安装后端依赖
cd ../backend && uv sync

# 3. 启动服务
uv run python app.py
```

打开 http://localhost:8765。

---

## 功能特性

- 🔑 **多种登录方式** — Bearer Token、短信验证码、账号密码
- 📥 **全量数据抓取** — 买入、卖出、租出、租入订单分页抓取，自动重试
- 📄 **CSV 导出** — 总表 + 可选分表，一键下载
- 📊 **可视化分析** — FIFO 盈亏匹配、磨损等级分析、武器类型分布、时间趋势图
- 🛡 **安全机制** — 双层限流、一次性下载令牌、日志脱敏

<div align="center">
  <img src="docs/images/dashboard.png" alt="Dashboard 截图" width="800">
  <br><sub>Dashboard — 实时交易概览与盈亏汇总。</sub>
</div>

---

## 注意事项

VPS 用户（阿里云、腾讯云等）可能遇到短信风控（5050 错误）—— Token 登录不受影响。详见 [IP 风控调研报告](docs/ip_risk_control_research.md)。

本项目仅供学习交流使用，与悠悠有品官方无任何关联。调用非官方 API 存在风控风险，请自行评估。

---

## 许可证

[MIT](LICENSE)