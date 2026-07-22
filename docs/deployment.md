# 部署指南

本文档涵盖 Docker 部署、VPS 配置、环境变量、监控和常见问题排查。

## 目录

- [Docker 部署](#docker-部署)
- [VPS 部署](#vps-部署)
- [环境变量](#环境变量)
- [Docker 镜像加速](#docker-镜像加速)
- [监控与健康检查](#监控与健康检查)
- [更新流程](#更新流程)
- [回滚](#回滚)
- [常见问题](#常见问题)

---

## Docker 部署

### 从 ghcr.io 拉取（推荐，海外服务器）

```bash
docker pull ghcr.io/youki258/uuyp-trade-analyzer:latest
docker run -d --restart=always --name uuyp -p 8765:8765 \
  ghcr.io/youki258/uuyp-trade-analyzer:latest
```

### 本地构建（VPS 网络慢时）

```bash
cd ~/uuyp-trade-analyzer
git pull
docker build -t uuyp-trade-analyzer .
docker stop uuyp && docker rm uuyp
docker run -d --restart=always --name uuyp -p 8765:8765 \
  uuyp-trade-analyzer:latest
```

### 镜像标签

| 标签 | 说明 |
|------|------|
| `:latest` | 最新稳定版（跟随 main 分支） |
| `:<sha>` | 特定 commit 的镜像（用于回滚） |

---

## VPS 部署

### 系统要求

| 项目 | 最低 | 推荐 |
|------|------|------|
| CPU | 1 核 | 2 核 |
| 内存 | 512MB | 1GB+ |
| 磁盘 | 5GB | 10GB+ |
| 系统 | Ubuntu 22.04+ | Ubuntu 24.04 |
| Docker | 24.0+ | 29.0+ |

### 首次部署

```bash
# 1. 安装 Docker（如未安装）
curl -fsSL https://get.docker.com | sudo sh

# 2. 克隆仓库（本地构建方式）
cd ~
git clone https://github.com/youki258/uuyp-trade-analyzer.git
cd uuyp-trade-analyzer

# 3. 构建镜像
docker build -t uuyp-trade-analyzer .

# 4. 启动容器
docker run -d --restart=always --name uuyp -p 8765:8765 \
  uuyp-trade-analyzer:latest

# 5. 验证
docker ps --filter name=uuyp
curl http://127.0.0.1:8765/api/status
```

### 生产配置（带 HTTPS 反向代理）

```bash
# Nginx 配置示例
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

使用 HTTPS 时，确保 Docker 环境变量设 `UUYP_COOKIE_SECURE=true`（Dockerfile 默认已设）。

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `UUYP_SESSION_COOKIE_NAME` | `uuyp_sid` | 会话 Cookie 名称 |
| `UUYP_SESSION_TTL_SECONDS` | `3600` | 会话保活时间（秒） |
| `UUYP_SESSION_MAX_COUNT` | `100` | 最大并发会话数 |
| `UUYP_CLEANUP_INTERVAL_SECONDS` | `300` | 过期会话清理间隔（秒） |
| `UUYP_ARTIFACT_TTL_SECONDS` | `1800` | 临时文件保留时间（秒） |
| `UUYP_COOKIE_SECURE` | `true` | Cookie Secure 标志（HTTPS 时必须 true） |
| `UUYP_COOKIE_SAMESITE` | `Strict` | Cookie SameSite 策略 |

### 通过 Docker 环境变量覆盖

```bash
docker run -d --name uuyp -p 8765:8765 \
  -e UUYP_SESSION_MAX_COUNT=50 \
  -e UUYP_SESSION_TTL_SECONDS=1800 \
  uuyp-trade-analyzer:latest
```

---

## Docker 镜像加速

国内 VPS 访问 Docker Hub 可能很慢，配置镜像加速：

```bash
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://mirror.baidubce.com",
    "https://docker.nju.edu.cn",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
EOF

sudo systemctl restart docker
```

配置后 `python:3.11-slim` 基础镜像从 8 分钟+ 降到 ~35 秒。

> 注意：镜像加速只对 Docker Hub 生效，ghcr.io 的镜像不走加速。如果 VPS 到 ghcr.io 也慢，改用本地构建方式。

---

## 监控与健康检查

### Docker HEALTHCHECK

Dockerfile 内置健康检查，每 30 秒请求 `/api/status`：

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' uuyp

# 查看健康检查日志
docker inspect --format='{{json .State.Health.Log}}' uuyp | python -m json.tool
```

### 手动检查

```bash
# 服务状态
curl http://127.0.0.1:8765/api/status
# 预期: {"status":"ok","mode":"stateless",...}

# 容器状态
docker ps --filter name=uuyp --format '{{.Status}}'
# 预期: Up X minutes (healthy)
```

### 日志查看

```bash
# 实时日志
docker logs -f uuyp

# 最近 100 行
docker logs uuyp --tail 100

# 特定时间后的日志
docker logs uuyp --since 1h
```

---

## 更新流程

### 方式一：ghcr.io 拉取（海外 VPS）

```bash
docker pull ghcr.io/youki258/uuyp-trade-analyzer:latest
docker stop uuyp && docker rm uuyp
docker run -d --restart=always --name uuyp -p 8765:8765 \
  ghcr.io/youki258/uuyp-trade-analyzer:latest
```

### 方式二：本地构建（国内 VPS）

```bash
cd ~/uuyp-trade-analyzer
git pull origin main
docker build -t uuyp-trade-analyzer .
docker stop uuyp && docker rm uuyp
docker run -d --restart=always --name uuyp -p 8765:8765 \
  uuyp-trade-analyzer:latest
```

### 后台构建（避免 SSH 超时）

VPS 上构建耗时较长时，用 `ssh -f` 在后台执行：

```bash
# 在本地终端执行
ssh -f -o ConnectTimeout=10 youki "cd ~/uuyp-trade-analyzer && git pull && docker build -t uuyp-trade-analyzer . > /tmp/docker-build.log 2>&1"

# 等待后查看进度
ssh youki "cat /tmp/docker-build.log | strings | tail -10"
```

---

## 回滚

### 回滚到特定 commit

```bash
# 查看可用镜像标签（ghcr.io 方式）
docker images --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}}' | grep uuyp

# 本地构建方式：checkout 到特定 commit
cd ~/uuyp-trade-analyzer
git log --oneline -10              # 找到要回滚的 commit
git checkout <commit-sha>
docker build -t uuyp-trade-analyzer .
docker stop uuyp && docker rm uuyp
docker run -d --restart=always --name uuyp -p 8765:8765 uuyp-trade-analyzer:latest
```

### 回滚到 ghcr.io 的特定版本

```bash
docker pull ghcr.io/youki258/uuyp-trade-analyzer:<sha>
docker stop uuyp && docker rm uuyp
docker run -d --restart=always --name uuyp -p 8765:8765 \
  ghcr.io/youki258/uuyp-trade-analyzer:<sha>
```

---

## 常见问题

### 容器启动后立即退出

**症状：** `docker ps` 显示 `Restarting (2) ...`

**排查：**
```bash
docker logs uuyp --tail 30
```

**常见原因：**

| 错误信息 | 原因 | 解法 |
|----------|------|------|
| `Permission denied: /home/appuser/.cache` | uv 缓存目录权限 | Dockerfile 用 `.venv/bin/gunicorn` 直接调用，设 `HOME=/tmp` |
| `Address already in use` | 8765 端口被占用 | `docker stop` 旧容器或换端口 |
| `ModuleNotFoundError` | import 路径错误 | 检查 `exporter/bill_exporter.py` 用相对导入 |

### VPS 拉取 ghcr.io 镜像超时

**原因：** 国内 VPS 到 ghcr.io 网络受限。

**解法：** 改用本地构建（见上方"更新流程 - 方式二"）。

### docker build 卡在拉取基础镜像

**原因：** VPS 到 Docker Hub 网络慢。

**解法：** 配置 Docker 镜像加速（见上方"Docker 镜像加速"）。

### 健康检查显示 unhealthy

**排查步骤：**
```bash
# 1. 进容器看应用是否运行
docker exec uuyp curl http://127.0.0.1:8765/api/status

# 2. 查看健康检查日志
docker inspect --format='{{json .State.Health.Log}}' uuyp

# 3. 查看应用日志
docker logs uuyp --tail 50
```

### 磁盘空间不足

```bash
# 清理停止的容器、无用镜像、构建缓存
docker system prune -a --volumes

# 查看磁盘占用
docker system df
df -h /
```
