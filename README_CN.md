# UUYP Trade Analyzer（悠悠有品交易分析器）

[English](README.md) | 中文

一个自托管的 Web 服务，用于导出并分析你在[悠悠有品（UUYP / youpin898.com）](https://www.youpin898.com)——国内 CS2 饰品交易平台——上的交易记录（买入 / 卖出 / 租赁）。

悠悠有品不提供任何官方账单导出功能（CSV / Excel / PDF 均无）。本项目通过调用悠悠有品 APP 端接口，自动抓取全部交易记录，导出 CSV，并提供可视化盈亏分析面板。

## 功能特性

- **多种登录方式** — Token 导入 / 短信验证码 / 账号密码
- **全量数据抓取** — 买入、卖出、租出、租入订单分页抓取，自动重试与风控退避
- **CSV 导出** — 总表 + 可选分表（买入/卖出/租赁）
- **可视化分析** — FIFO 盈亏匹配、磨损等级分析、武器类型分析、时间趋势图
- **多用户并发** — 无状态会话设计，内存隔离，支持多人同时使用
- **安全机制** — 双层限流、一次性下载令牌、日志脱敏、Cookie HttpOnly + SameSite
- **Docker 一键部署**

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.11+, Flask 3, requests, gunicorn |
| 前端 | React 18, TypeScript, Vite 5, Tailwind CSS, Radix UI, Recharts |
| CSV 解析 | PapaParse（浏览器端） |
| 包管理 | uv（Python）、npm（前端） |
| 部署 | Docker, GitHub Actions → ghcr.io |

## 使用方式选择

- **本地自部署（推荐）** — 在自己的电脑或家庭服务器上运行。住宅 IP 不受悠悠有品数据中心风控影响，所有登录方式（自动短信、密码、Token）开箱即用。
- **公网 VPS 部署** — 数据中心 IP（阿里云、腾讯云等）在短信端点会被标记：自动短信降级为手动短信（5050，已实测可用），Token 登录不受影响。详见下文「IP 风控与合规优先策略」。

## 快速开始

前置要求：Python 3.11+ 与 [uv](https://docs.astral.sh/uv/)、Node.js 22+。

```bash
# 1. 构建前端（产物输出到 static/）
npm install
npm run build

# 2. 安装后端依赖
uv sync

# 3. 启动服务
uv run python app.py
# 打开 http://localhost:8765
```

CLI 参数：

```bash
python app.py --port 8080 --host 127.0.0.1
```

> Flask 直接托管 `static/` 下的前端构建产物。如果跳过第 1 步，界面将缺失或为旧版本。前端开发流程（vite dev、lint 等）见 [docs/development.md](docs/development.md)。

## Docker 部署

```bash
docker build -t uuyp-trade-analyzer .
docker run -d -p 8765:8765 uuyp-trade-analyzer
```

### GitHub Container Registry

推送 `main` 分支会自动触发构建（后端 pytest + 前端 vitest + 镜像构建）：

```bash
docker pull ghcr.io/youki258/uuyp-trade-analyzer:latest
```

## API 接口

### 会话

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/status` | 服务状态 + 会话 TTL |
| GET | `/api/session/info` | 当前会话信息 |
| POST | `/api/session/destroy` | 销毁会话 |

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/token` | Bearer Token 登录 |
| POST | `/api/auth/sms/send` | 发送短信验证码 |
| POST | `/api/auth/sms/verify` | 校验验证码并登录 |
| POST | `/api/auth/pwd` | 密码登录 |
| GET | `/api/auth/me` | 当前认证状态 |

### 数据

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/fetch/start` | 触发全量抓取 + CSV 导出 |
| GET | `/api/files` | 列出当前会话的 CSV 文件 |
| GET | `/api/csv/<filename>` | 读取 CSV 内容 |
| POST | `/api/upload-csv` | 上传外部 CSV（单文件 ≤10MB，最多 8 个） |
| POST | `/api/download-ticket` | 创建一次性下载令牌 |
| GET | `/api/download/<ticket>` | 消费令牌并下载 |

## 环境变量

所有变量均为可选。「代码默认值」为未设置变量时的取值；Docker 镜像通过 `ENV` 预设了自己的值（见 Dockerfile）。

| 变量 | 代码默认值 | Docker 预设 | 说明 |
|------|-----------|-------------|------|
| `UUYP_SESSION_COOKIE_NAME` | `uuyp_sid` | `uuyp_sid` | 会话 Cookie 名称 |
| `UUYP_SESSION_TTL_SECONDS` | `3600` | `3600` | 会话存活时间（秒，最小 60） |
| `UUYP_SESSION_MAX_COUNT` | `100` | `100` | 最大并发会话数（最小 100） |
| `UUYP_CLEANUP_INTERVAL_SECONDS` | `300` | `300` | 过期会话清理间隔（秒，最小 5） |
| `UUYP_ARTIFACT_TTL_SECONDS` | = 会话 TTL | `1800` | 临时文件保留时间（秒，最小 120） |
| `UUYP_COOKIE_SECURE` | `false` | `true` | Cookie Secure 标志（HTTPS 下设为 `true`） |
| `UUYP_COOKIE_SAMESITE` | `Strict` | `Strict` | Cookie SameSite 策略（`Strict` / `Lax` / `None`） |

带注释的模板见 [.env.example](.env.example)。另有一个可选的 `UUYP_PROXY_URL` 变量用于默认关闭的代理逃生舱——见下文「IP 风控与合规优先策略」。

## 项目结构

```
├── app.py                    # 入口：CLI 参数，启动 Flask
├── server/                   # Flask 无状态后端
│   ├── app.py                # 路由与核心逻辑
│   ├── config.py             # 环境变量配置
│   ├── session_store.py      # 内存会话管理
│   ├── storage.py            # 临时文件存储（按会话隔离）
│   ├── download_tickets.py   # 一次性下载令牌
│   └── rate_limit.py         # 内存限流器
├── exporter/                 # 悠悠有品 API 客户端
│   ├── client.py             # 认证 + 订单抓取（含 uk 设备校验）
│   └── bill_exporter.py      # 全量分页抓取 + CSV 导出
├── src/                      # React 前端源码
│   ├── pages/                # Dashboard、ProfitAnalysis、Trend、CS2Analysis、TradeDetail、Login
│   ├── components/           # 图表、表格、上传面板、认证、布局组件
│   ├── hooks/                # React hooks
│   ├── utils/                # CSV 解析、FIFO 匹配、CS2 分析器
│   └── types/                # TypeScript 类型定义
├── tests/                    # 后端 pytest 测试
├── static/                   # Vite 构建产物（由 Flask 托管）
├── docs/                     # 文档
├── .github/workflows/        # CI：测试 + 构建 + 推送 ghcr.io
├── .env.example              # 环境变量模板
├── Dockerfile
├── pyproject.toml
└── vite.config.ts
```

## 架构设计

- **无状态** — 无外部数据库。会话与文件存于内存 + 临时目录，重启即清空。
- **会话隔离** — 每个浏览器通过 Cookie 获得独立会话，自动过期与清理。
- **认证代理** — 后端代理所有悠悠有品 API 调用，用户凭据不经过前端。
- **客户端分析** — 盈亏计算（FIFO 匹配、图表）全部在浏览器中完成，后端只负责取数与下发。
- **uk 设备校验** — 客户端初始化时从 `/api/app` 获取 `uk` 令牌，降低风控概率。

## 测试

```bash
# 后端（tests/）
uv run pytest tests/ -v

# 前端（src/**/*.test.ts）
npx vitest run
```

两套测试均会在每次推送 `main` 时由 CI 执行。

## IP 风控与合规优先策略

本服务部署在数据中心（云服务器）时，其 IP 的 ASN（如阿里云 AS37963）会被悠悠有品在「自动发送短信」(`SendSignInSmsCode`) 端点标记。2026-07-23 实测确认：**风控表现为自动短信降级为手动验证（返回 5050），而非直接拒绝**——此前 SOCKS5 实验 100% 失败是因为代理无法改变这一降级。详细机理见 [IP 风控调研报告](docs/ip_risk_control_research.md)。

**按场景推荐登录方式**：

- **本地/家庭网络自部署** — 自动短信、密码、Token 均可，住宅 IP 不受风控限制。
- **公网 VPS（数据中心 IP）** —
  1. **手动短信（5050）** — 已实测在数据中心 IP 可用：服务端返回 5050 后，页面会直接显示上行短信的内容与目标号码（经配置接口获取，无需官方 APP），用本人手机发送后验证码留空即可登录
  2. **粘贴 Token** — 零 IP 风险，但需 APP 抓包获取，仅适合进阶用户
  3. *可选* **住宅/移动代理自动发短信**——需设置 `UUYP_PROXY_URL`，且必须配合 TLS 指纹伪造（`curl_cffi`）才有效；默认关闭，详见 [改造设计](docs/ip_risk_control_design.md)。

已登录后的数据抓取（持 token + `uk` 设备校验 + 限频）在数据中心 IP 下正常工作，不受上述风控影响。

## 文档

- [开发指南](docs/development.md) — 分支策略、提交规范、测试、CI/CD、安全编码标准
- [部署指南](docs/deployment.md) — Docker 部署、VPS 配置、镜像加速、监控、回滚
- [API 研究](docs/api_research.md) — 悠悠有品 API 逆向研究报告
- [IP 风控调研报告](docs/ip_risk_control_research.md) — 业界 IP 风控与绕过实践全景分析
- [IP 风控改造设计](docs/ip_risk_control_design.md) — 合规优先策略下的改造方案设计（可选代理逃生舱）

## 致谢与出处

本项目站在社区逆向工程的成果之上。API 相关部分的出处如下：

- **悠悠有品非官方私有 API**（`api.youpin898.com`）— 接口逆向自 Android APP（v5.46.1），研究笔记见 [docs/api_research.md](docs/api_research.md)。
- **[Steamauto](https://github.com/Steamauto/Steamauto)**（`uuyoupinapi` 模块）— 登录流程、买入/卖出/租出订单接口及分页参数（`page_size=50`）的实现参考。
- **[cs2-trade-manager](https://github.com/cs2trading/cs2-trade-manager)** — `uk` 设备校验的实现参考。

同时感谢本服务依赖的开源项目，包括 React、Flask、Recharts、PapaParse、Radix UI、Tailwind CSS 等。

## 相关项目

- 桌面版（PyInstaller）：[cs2-youpin-trade-analyzer](https://github.com/youki258/cs2-youpin-trade-analyzer)

## 免责声明

本项目仅供学习交流使用，与悠悠有品官方无任何关联。调用非官方 API 存在风控风险，请自行评估。

This project is for educational purposes only and is not affiliated with UUYP. Using unofficial APIs carries risk of account restrictions.

## 许可证

[MIT](LICENSE)

## 关键词

悠悠有品, UUYP, youpin898, CS2, CSGO, 饰品交易, 账单导出, 盈亏分析, bill export, trade analyzer, profit loss, skin trading, CSV export, 租赁, lease, FIFO
