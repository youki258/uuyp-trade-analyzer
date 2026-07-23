# IP 风控改造方案设计（youki / UUYP）

> 文档类型：**改造方案设计（仅设计，不写代码）**
> 配套报告：[`ip_risk_control_research.md`](./ip_risk_control_research.md)
> 核心原则：**默认合规优先，代理为可关闭的可选逃生舱；绝不把绕过做成默认路径。**

---

## 1. 设计原则

1. **合规优先为默认路径**：`/api/auth/token`（粘贴 token）与 `/api/auth/sms/end` 的 5050 手动短信已端到端实现，是零 IP 风险的官方通道，保持首选。
2. **代理是可选逃生舱，默认关闭**：仅当用户确实需要在 youki 服务器上「自动发短信」时，才通过 `UUYP_PROXY_URL` 启用；为空时行为与现在完全一致。
3. **代理 + TLS 伪造不可分割**：依据研究报告维度 1 结论，纯 `requests` + 代理仍会被 JA3/JA4 识别为 Python 客户端。逃生舱重试必须使用 `curl_cffi`（`impersonate`）伪造 TLS，二者缺一不可。
4. **影响面最小**：逃生舱只作用于 `send_sms_code`（发短信）端点，绝不改动数据抓取主路径；`curl_cffi` 依赖在 `UUYP_PROXY_URL` 为空时不加载。
5. **可观测、可回滚**：所有代理重试带日志与明确的失败原因，便于核查 SOCKS5 类历史问题是否复现。

---

## 2. 改动设计（文件 / 函数级）

### 2.1 A. 住宅/移动代理「可选逃生舱」—— `exporter/client.py`

**改动点 1：`UUYPClient.__init__` 新增代理参数**
- 新增参数 `proxy: str = ""`（默认空）。
- 来源：环境变量 `UUYP_PROXY_URL`，支持 `http(s)://` 与 `socks5://`、`socks5h://`。
- 仅当 `proxy` 非空时，构造一个**独立的代理 session**（不直接改 `self.session`，避免污染数据抓取路径）。

**改动点 2：`send_sms_code` 增加「直连优先 + 代理重试一次」**
- 流程：
  1. 先使用现有 `self.session` 直连调用 `SendSignInSmsCode`。
  2. 若返回风控码（非 0 且非 5050）或网络/超时异常，且 `proxy` 非空 → 用**代理 session**（见下）重试一次。
  3. 代理重试仍失败 → 返回结构化错误，提示「请改用本机手动短信或粘贴 token」（不静默吞错）。
- **代理 session 必须用 `curl_cffi.requests.Session`**（而非 `requests`），并设 `impersonate="chrome"`（或移动端剖面，需实测 UUYP App 的真实 JA3），使 ClientHello 与声称的 UA/设备一致。

**改动点 3：`curl_cffi` 依赖的惰性加载**
- 代理 session 的构造放在「`proxy` 非空」分支内，延迟 `import curl_cffi`。
- `UUYP_PROXY_URL` 为空时：不 import、不安装额外依赖、主流程零影响。
- `pyproject.toml` 将 `curl_cffi` 标记为 **optional dependency**（如 `extras = ["proxy"]`），Dockerfile 默认不装，避免体积与攻击面扩大。

**设计注释必须写明的风险提示**（写入代码注释与文档）：
- 需**中国住宅/移动 IP**（数据中心 IP 无意义，已被 SOCKS5 实验证伪）；
- 供应商**实名认证**；
- **隐私暴露**：触发真实短信的请求经第三方家庭 IP 出口；
- **成本**：约 ¥1500/月或 ¥8/GB；
- **TLS 伪造依赖**新增（`curl_cffi`）。

### 2.2 B. 前端引导强化—— `src/components/auth/SmsLogin.tsx` + Token 登录入口

- **自动发短信返回非 0/非 5050 风控码时**：明确提示「自动发送被服务器风控，请改用：① 本机发送短信完成手动验证；或 ② 直接粘贴 token」。
- **入口优先级（视觉）**：
  - 推荐首要：**粘贴 token**（突出、默认展开或置顶）；
  - 次要：**手动短信（5050）**；
  - 兜底：**自动短信**（注明「数据中心服务器可能失败」）。
- `SmsUpSignIn`（空 code）链路 UI 已通，仅按需优化提示文案，不新增交互逻辑。

### 2.3 C. 后端错误语义—— `server/app.py`

- `/api/auth/sms/send` 在 code 既非 `0` 也非 `5050` 时，返回 JSON：
  ```json
  { "ok": false, "code": <原始码>, "requiresManualSms": false, "hint": "manual_or_token" }
  ```
- 前端据 `hint` 分流到「手动短信 / 粘贴 token」引导，不新增端点。
- `src/utils/statelessApi.ts` 可选透传 `hint` 字段（类型补充）。

### 2.4 D. 文档

- 新增 `docs/ip_risk_control_research.md`（研究报告）与本文（设计）。
- `README.md` 增加「IP 风控与合规优先策略」章节，指向两份文档。
- `docs/api_research.md` 已有风控风险提示保持不动。

---

## 3. 关键文件清单

| 文件 | 改动 |
|------|------|
| `exporter/client.py` | `UUYPClient.__init__` 增 `proxy` 参数；`send_sms_code` 增「直连优先 + 代理重试」；`curl_cffi` 惰性加载 |
| `pyproject.toml` | `curl_cffi` 标记为 optional extra |
| `Dockerfile` | 默认不装 proxy extra（如需可 `pip install .[proxy]`） |
| `src/components/auth/SmsLogin.tsx` | 风控码引导文案 + token 入口优先级 |
| `src/utils/statelessApi.ts` | 可选透传 `hint` 字段 |
| `server/app.py` | `/api/auth/sms/send` 返回 `hint: "manual_or_token"` |
| `docs/ip_risk_control_research.md` | 新建，研究报告 |
| `docs/ip_risk_control_design.md` | 本文 |
| `README.md` | 新增策略说明章节 |

---

## 4. 风险与权衡

| 风险点 | 说明 | 缓解 |
|--------|------|------|
| 代理 + TLS 仍失败 | UUYP 可能叠加设备 attestation 层，代理/TLS 均无法伪造 | 逃生舱失败即回退手动短信/粘贴 token；不阻塞主路径 |
| `curl_cffi` 剖面过时 | 浏览器升级后 JA3 漂移被识别为「可疑旧版本」 | 依赖版本随浏览器更新；可选 `impersonate` 值可配置 |
| 隐私/合规暴露 | 触发短信经第三方住宅 IP | 默认关闭；文档明示；仅供用户自决 |
| 依赖体积/攻击面 | `curl_cffi` 引入原生库 | optional extra，默认不装；惰性 import |
| 成本 | 住宅/移动代理付费 | 仅极个别用户启用；非默认 |

---

## 5. 开关与回滚设计

- **开关**：环境变量 `UUYP_PROXY_URL`。
  - 为空（默认）→ 纯合规优先路径，行为与现状一致，`curl_cffi` 不加载。
  - 非空 → 仅 `send_sms_code` 启用代理重试一次。
- **回滚**：删除/清空 `UUYP_PROXY_URL` 即完全回到现状；无需代码回滚。代理重试逻辑包裹在 try/except，异常不影响直连主流程。
- **可观测**：代理重试前后记录 `proxy_used`、`retry_result`、`final_error`，便于与历史 SOCKS5 100% 失败对比排查。

---

## 6. 验收标准（设计视角，非实现）

1. `UUYP_PROXY_URL` 为空时：所有现有测试/行为不变，`curl_cffi` 未被 import。
2. 启用 `UUYP_PROXY_URL` 且配置中国住宅/移动代理 + `curl_cffi` impersonate 后：`send_sms_code` 在直连被拦时能用代理重试，且 TLS 指纹为浏览器/移动剖面。
3. 代理重试仍失败：返回明确 `hint: "manual_or_token"`，前端正确引导，不静默失败。
4. 数据抓取主路径（持 token）完全不经过代理 session。

---

## 7. 明确排除（不实现）

- **浏览器自动化**（Playwright / undetected-chromedriver / Camoufox）：UUYP 为直连 HTTP API，无 JS 挑战，徒增复杂度。
- **数据中心代理 / SOCKS5 轮换**：源 ASN 已是阿里云，换数据中心 IP 无效（已被 SOCKS5 实验证伪）。
- **伪造设备指纹绕过读风控**：`uk` 已足够，过度伪造反而增风险。
- **默认路径引入 TLS 伪造**：`curl_cffi` 仅作为代理逃生舱内部依赖，且 `UUYP_PROXY_URL` 为空时完全不加载、不影响主流程与依赖体积。
