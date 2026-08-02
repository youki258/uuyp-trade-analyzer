# 自动部署说明

第一次配置或迁移到另一台 VPS，请先阅读 [Windows 完整教程](github-actions-vps-deployment-guide.md)。

## 发布链路

合并或推送到 `main` 后，`.github/workflows/deploy.yml` 按以下顺序执行：

1. 在 Ubuntu runner 上执行后端测试、前端测试、lint、类型检查和依赖审计。
2. 构建 Linux Docker 镜像并执行 Trivy 高危漏洞扫描。
3. 将镜像推送到 GHCR 的 `latest` 和当前提交 SHA 标签。
4. 使用 SSH 连接 VPS，拉取当前提交 SHA 对应的不可变镜像。
5. 按现有配置重建 `uuyp` 容器：`127.0.0.1:8765:8765`、`restart=always`、单 Gunicorn worker。
6. 在 VPS 内轮询本地 `/api/status`；健康后通过同一 SSH 通道从 VPS 检查公网 HTTPS 地址。
7. 新容器不健康时，自动恢复部署前的旧镜像，并让 Actions 任务失败。

同一时间只允许一个生产部署任务运行，避免多个提交同时重建容器。VPS 保留旧镜像，不会在部署脚本中执行镜像清理，便于回滚。

## GitHub Secrets

仓库需要配置以下 Secrets：

| Secret | 用途 | 当前值来源 |
| --- | --- | --- |
| `VPS_HOST` | VPS 地址 | `8.141.80.17` |
| `VPS_PORT` | SSH 端口 | `2233` |
| `VPS_USER` | SSH 用户 | `youki` |
| `VPS_SSH_KEY` | 部署私钥 | 本机 SSH 配置中的 `svr_youki_aliyun` |
| `VPS_KNOWN_HOSTS` | 固定 SSH 主机指纹 | `ssh-keyscan -p 2233 8.141.80.17` 输出 |
| `VPS_HEALTHCHECK_URL` | 公网健康地址 | `https://youpin.youki.me/api/status` |

私钥只作为 GitHub Actions Secret 使用，不写入仓库、Docker 镜像、日志或部署脚本。当前 GHCR 镜像可由 VPS 直接拉取，因此不需要把 GHCR Token 放到 VPS。

## 手动配置命令

以下命令只设置部署参数，不包含 UUYP Token：

```powershell
gh secret set VPS_HOST --repo youki258/uuyp-trade-analyzer --body 8.141.80.17
gh secret set VPS_PORT --repo youki258/uuyp-trade-analyzer --body 2233
gh secret set VPS_USER --repo youki258/uuyp-trade-analyzer --body youki
gh secret set VPS_HEALTHCHECK_URL --repo youki258/uuyp-trade-analyzer --body https://youpin.youki.me/api/status
Get-Content -Raw C:\Users\14733\.ssh\svr_youki_aliyun | gh secret set VPS_SSH_KEY --repo youki258/uuyp-trade-analyzer
& 'C:\Program Files\Git\usr\bin\ssh-keyscan.exe' -p 2233 8.141.80.17 2>$null | gh secret set VPS_KNOWN_HOSTS --repo youki258/uuyp-trade-analyzer
```

配置后可在 GitHub Actions 页面手动运行 `Deploy`，或合并一次 `main` 触发完整链路。部署任务失败时，先查看 Actions 日志中的健康检查和回滚结果，不要把 Token 粘贴到日志中。
