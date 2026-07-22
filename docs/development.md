# 开发指南

本文档定义了 uuyp-trade-analyzer 的开发流程、分支策略、测试规范和编码标准。

## 目录

- [本地开发环境](#本地开发环境)
- [分支策略](#分支策略)
- [提交规范](#提交规范)
- [测试规范](#测试规范)
- [CI/CD 流水线](#cicd-流水线)
- [安全编码标准](#安全编码标准)
- [代码审查清单](#代码审查清单)

---

## 本地开发环境

### 依赖安装

```bash
# Python 后端（uv 管理依赖）
uv sync                          # 安装运行依赖
uv sync --all-extras             # 安装运行 + 开发依赖（含 pytest）

# 前端（npm 管理依赖）
npm install                      # 安装前端依赖
```

### 启动开发服务器

```bash
# 方式一：后端 + 前端分别启动（推荐开发时用）
uv run python app.py --port 8765 --host 127.0.0.1   # 后端
npm run dev                                          # 前端（Vite dev server，热更新）

# 方式二：构建前端后用后端服务托管
npm run build                   # 构建前端到 static/
uv run python app.py            # 后端同时托管前端静态文件
```

开发模式下后端使用 Flask 内置服务器（单线程），生产模式使用 gunicorn（4 worker）。

### 环境变量

参考 `.env.example`。本地开发通常不需要 `.env` 文件，默认值适用于开发。生产部署见 [部署指南](./deployment.md)。

---

## 分支策略

### 核心原则

`main` 分支永远保持"可部署"状态。所有修改在 feature 分支上完成，通过 PR 合并。

### 分支命名

| 类型 | 前缀 | 示例 |
|------|------|------|
| 新功能 | `feat/` | `feat/lease-in-support` |
| Bug 修复 | `fix/` | `fix/profit-matcher-unmatched` |
| 文档 | `docs/` | `docs/dev-guide` |
| 重构 | `refactor/` | `refactor/split-server-routes` |

### 完整工作流

```bash
# 1. 从 main 创建分支
git checkout main
git pull origin main
git checkout -b fix/your-issue

# 2. 开发 + 提交
git add -A
git commit -m "fix: 简要描述"

# 3. 如果改动涉及逻辑，补测试（见下方测试规范）
# 4. 本地跑测试确认通过
npx vitest run          # 前端测试
uv run pytest tests/ -v  # 后端测试

# 5. 推分支
git push -u origin fix/your-issue

# 6. 创建 PR
gh pr create --title "fix: 简要标题" --body "描述改动"

# 7. CI 自动跑测试 + 安全扫描

# 8. 合并（squash 方式，自动删除分支）
gh pr merge --squash --delete-branch

# 9. 切回 main 拉取
git checkout main
git pull origin main
```

### 什么时候可以直接推 main

- 改 README 错别字、补充文档
- 改配置文件默认值
- 紧急修复线上 bug（但事后应补测试）

判断标准：改动是否影响功能逻辑？是 → 走分支；否 → 可直接推 main。

---

## 提交规范

使用 Conventional Commits 格式：

```
<type>: <description>

可选 body（换行后详细说明）
```

### Type 列表

| Type | 用途 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 新增租赁订单抓取` |
| `fix` | Bug 修复 | `fix: profitMatcher 未匹配虚增盈亏` |
| `chore` | 构建/配置 | `chore: 统一项目名` |
| `refactor` | 重构 | `refactor: 拆分 server/app.py 路由` |
| `docs` | 文档 | `docs: 新增开发指南` |
| `test` | 测试 | `test: 补充 rate_limit 清理测试` |

### 示例

```
fix: profitMatcher 未匹配兜底修复

未匹配的 sell 从 status=realized 改为 status=unmatched，
profitLoss 设为 null，不再虚增已实现盈亏。
```

---

## 测试规范

### 测试框架

| 层 | 框架 | 命令 |
|----|------|------|
| 前端逻辑 | vitest | `npx vitest run` |
| 后端逻辑 | pytest | `uv run pytest tests/ -v` |
| 监听模式 | vitest watch | `npx vitest` |

### 文件位置

```
src/utils/profitMatcher.test.ts     # 前端测试与源文件同目录，*.test.ts
tests/test_rate_limit.py             # 后端测试在 tests/ 目录
```

### 什么时候需要写测试

| 改动类型 | 需要测试 | 例子 |
|----------|---------|------|
| 新增计算逻辑 | 是 | profitMatcher、cs2Analyzer |
| 修复逻辑 Bug | 是 | 修复时先写一个复现 Bug 的测试 |
| 新增 API 端点 | 建议是 | 测试请求参数校验、权限检查 |
| 改样式/布局 | 否 | |
| 改文档/配置 | 否 | |
| 改依赖版本 | 否 | |

### 测试编写原则

1. **一个测试只验证一个行为**

```typescript
// 好
it("未匹配的卖出不计入 realizedPL", () => {
  const pairs = matchProfitLoss([sellOnly]);
  const stats = calcDashboardStats([sellOnly], pairs);
  expect(stats.realizedPL).toBe(0);
});

// 不好 — 测了太多东西，失败时不知道哪个断言挂了
it("matching works", () => {
  const pairs = matchProfitLoss(allRecords);
  expect(pairs.length).toBe(5);
  expect(pairs[0].status).toBe("realized");
  expect(pairs[1].status).toBe("holding");
  expect(pairs[2].profitLoss).toBe(50);
  // ...
});
```

2. **测试名描述预期行为，不是描述实现**

```typescript
// 好
it("卖出匹配到先买入的记录 (FIFO)", () => { ... });

// 不好
it("返回长度为 3 的数组", () => { ... });
```

3. **构造清晰的假数据**

```typescript
function makeRecord(
  id: string,
  type: "buy" | "sell",
  priceYuan: number,
  dateStr: string,
  templateId = "w1",
): TradeRecord { ... }
```

用工厂函数避免每个测试都手写完整对象。

4. **Python 测试用中文 docstring 描述意图**

```python
def test_blocks_over_limit():
    """超过限制应拒绝"""
    ...
```

### CI 中的测试

`.github/workflows/deploy.yml` 在构建 Docker 镜像前先跑测试：

```
pytest (7 tests) → vitest (6 tests) → 全过 → docker build → ghcr.io push
                                        全挂 → 停止，不构建镜像
```

测试不通过 = 镜像不会被构建和推送 = 坏代码不会进生产。

---

## CI/CD 流水线

### 触发条件

- push 到 `main` 分支
- 手动触发（GitHub Actions 页面点 "Run workflow"）

### 流水线步骤

```
checkout 代码
  ↓
安装 Python + uv → 跑 pytest
  ↓
安装 Node + npm → 跑 vitest
  ↓ （全过才继续）
Docker buildx 构建镜像
  ↓
登录 ghcr.io → 推送镜像（:latest + :sha）
```

### 权限配置

deploy.yml 需要声明 `permissions: packages: write`，否则 ghcr.io 推送会被拒绝。

### 常见 CI 失败原因

| 错误 | 原因 | 解法 |
|------|------|------|
| `npm ci` 报缺少 esbuild | Windows 生成的 lock 文件缺 Linux 平台包 | 用 `npm install` 代替 `npm ci` |
| `ghcr.io push denied` | GITHUB_TOKEN 无 packages 写权限 | deploy.yml 加 `permissions: packages: write` |
| `Node.js 20 deprecated` | GitHub 已废弃 Node 20 | 升级到 Node 22 |
| pytest/vitest 失败 | 代码改动引入回归 | 修复代码，确认本地测试通过再推 |

---

## 安全编码标准

基于项目安全审计总结，以下规则必须遵守：

### 日志脱敏

```python
# 禁止：打印 Token、密码、API 响应内容
print(f"Token: {token[:20]}")          # 不要
print(f"API response: {response.text}")  # 不要

# 正确：只记录操作和状态码
print(f"[OK] Token 验证成功")
print(f"[API] POST /api/sell/list -> {response.status_code}")
```

后端使用 `_audit()` 函数记录审计日志，自动脱敏 token/password/phone 等字段。

### 输入校验

```python
# 所有用户输入必须校验
lease_in_path = payload.get("leaseInPath")
if lease_in_path and not lease_in_path.startswith("/api/"):
    return jsonify({"status": "error", "message": "invalid path"}), 400
```

### 认证检查

所有数据操作端点必须调用 `_require_auth()`：

```python
@app.route("/api/files")
def api_files():
    auth_err = _require_auth()     # 必须在业务逻辑之前
    if auth_err[1]:
        return auth_err[1]
    # ... 业务逻辑
```

### 请求超时

所有 HTTP 请求必须设置 timeout，防止上游不响应时无限阻塞：

```python
# 后端
requests.post(url, json=data, timeout=15)

// 前端
fetch("/api/auth/token", { signal: AbortSignal.timeout(15000) })
```

### 前端数据存储

- 禁止用 localStorage 存敏感数据
- sessionStorage 只存必要的聚合数据，不存全量交易记录
- Token/密码由后端 HttpOnly Cookie 管理，前端不持有

---

## 代码审查清单

PR 合并前检查：

- [ ] 提交信息符合 Conventional Commits 格式
- [ ] 新增逻辑有对应测试
- [ ] 本地 `npx vitest run` 和 `uv run pytest tests/ -v` 全过
- [ ] 没有打印 Token/密码/响应内容到日志
- [ ] 新增 API 端点有 `_require_auth()` 检查
- [ ] 新增 HTTP 请求有 timeout
- [ ] 没有引入新的 localStorage 敏感数据存储
- [ ] catch 块暴露真实错误信息给用户（不吞错）
