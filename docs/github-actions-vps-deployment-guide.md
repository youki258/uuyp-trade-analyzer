# GitHub Actions + GHCR + VPS 自动部署教程（Windows 版）

这份教程说明如何把一个 Docker 项目配置成：

**推送或合并到 main → GitHub Actions 在 Linux 上测试和构建 → 推送镜像到 GHCR → SSH 登录 VPS → VPS 拉取指定提交的镜像 → 健康检查 → 失败自动回滚。**

本项目已经按这个模式实现。教程中的主机、用户名、私钥和 Token 都使用占位符，不能把真实敏感值复制进文档。

## 1. 先理解整体链路

    Windows 本地开发
            |
            | push / merge 到 main
            v
    GitHub Actions（ubuntu-latest）
      测试、审计、构建 Docker、Trivy 扫描
            |
            | push latest 和完整提交 SHA
            v
    GHCR（GitHub Container Registry）
            |
            | SSH 到 VPS，docker pull 完整 SHA
            v
    VPS
      备份旧镜像 → 重建 uuyp 容器 → 本地健康检查
            |
            +-- 成功：通过公网 HTTPS 检查
            |
            +-- 失败：删除新容器，恢复旧镜像

这里最重要的设计是：VPS 部署完整的 40 位提交 SHA，例如：

    ghcr.io/<owner>/<repo>:<40-character-commit-sha>

不直接用 latest 部署。latest 方便人查看，完整 SHA 才能准确知道线上运行的是哪次提交。

## 2. 需要准备什么

### Windows 本地

需要能运行以下命令：

    git --version
    ssh -V
    gh --version
    Get-Command ssh-keygen, ssh-keyscan

GitHub CLI 第一次使用时登录：

    gh auth login

如果 ssh-keyscan 不在 PATH 中，Git for Windows 通常自带它，也可以使用：

    & "C:/Program Files/Git/usr/bin/ssh-keyscan.exe" -p <VPS_PORT> <VPS_HOST>

### VPS

VPS 使用 Linux，并准备好：

    docker --version
    docker ps
    curl --version
    bash --version

VPS 不需要安装 Git，也不需要保存项目源代码。Actions 构建镜像后，VPS 只负责从 GHCR 拉取并运行镜像。

### GitHub

你需要对仓库有管理 Actions Secrets 的权限。当前项目的部署分支是 main：

- 推送或合并到 main：自动部署。
- 其他分支：不会部署生产环境。
- 手动点击 workflow_dispatch：可以重新部署 main 当前版本。

## 3. 准备 VPS 上的 Docker 权限

先用计划部署的 SSH 用户登录 VPS：

    ssh -p <VPS_PORT> <VPS_USER>@<VPS_HOST>

检查 Docker：

    docker version
    docker ps

如果普通用户不能执行 Docker，需要让管理员授予权限：

    sudo usermod -aG docker <VPS_USER>

重新登录后再执行 docker ps。注意：能直接访问 Docker 的用户通常拥有接近 root 的主机权限，因此生产环境最好单独创建部署用户，不要直接复用个人登录用户。

当前部署脚本会使用以下容器约定：

- 容器名：uuyp
- 容器重启策略：always
- 宿主机绑定：127.0.0.1:8765
- 容器健康地址：http://127.0.0.1:8765/healthz

公网访问由 Caddy 或其他反向代理转发到宿主机的 127.0.0.1:8765。不要为了让 Actions 访问而把应用端口直接暴露到公网。

## 4. 为 Actions 单独创建 SSH 密钥

推荐为每个项目创建专用的 Ed25519 密钥，不要把个人长期登录 VPS 的私钥到处复用。

在 Windows PowerShell 执行：

    ssh-keygen -t ed25519 -f "$env:USERPROFILE/.ssh/uuyp_actions_deploy" -C "uuyp-actions-deploy"

这会生成两个文件：

- uuyp_actions_deploy：私钥，只能放入 GitHub Secret。
- uuyp_actions_deploy.pub：公钥，可以放到 VPS。

查看公钥：

    Get-Content "$env:USERPROFILE/.ssh/uuyp_actions_deploy.pub"

只复制这一行公钥内容，在 VPS 上追加到授权文件：

    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    nano ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys

把公钥单独占一行保存。不要把没有 .pub 后缀的私钥内容粘贴到聊天、Issue、README 或代码中。

本地先测试这把密钥：

    ssh -i "$env:USERPROFILE/.ssh/uuyp_actions_deploy" -p <VPS_PORT> <VPS_USER>@<VPS_HOST> "docker ps"

测试成功后，Actions 才有可能成功。当前项目已经配置了部署密钥；如果以后更换密钥，只需要同时更新 VPS 的 authorized_keys 和 GitHub 的 VPS_SSH_KEY。

## 5. 固定 VPS 的 SSH 主机指纹

Actions 必须验证它连接的是正确的 VPS。不要在 workflow 中使用 StrictHostKeyChecking=no。

先通过云厂商控制台、已有可信 SSH 连接或服务器管理员确认 VPS 的主机指纹，再获取 known_hosts 内容：

    ssh-keyscan.exe -p <VPS_PORT> <VPS_HOST>

如果命令输出了多行，完整保留。这个输出会放入 VPS_KNOWN_HOSTS。主机迁移、重装系统或 SSH 主机密钥变化后，必须重新核对并更新它；不要为了绕过错误直接关闭主机校验。

## 6. 配置 GitHub Actions Secrets

### 6.1 使用网页配置

打开：

    GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret

创建以下 6 个 Repository secrets：

| 名称 | 内容 | 敏感程度 |
| --- | --- | --- |
| VPS_HOST | VPS 域名或 IP | 低 |
| VPS_PORT | SSH 端口，例如 22 | 低 |
| VPS_USER | 部署用 Linux 用户 | 中 |
| VPS_SSH_KEY | 私钥文件的完整内容 | 高 |
| VPS_KNOWN_HOSTS | ssh-keyscan 的完整输出 | 中 |
| VPS_HEALTHCHECK_URL | 公网健康检查地址 | 低到中 |

VPS_SSH_KEY 要粘贴私钥的完整内容，包括开头和结尾标记。保存后，GitHub 页面不会再次显示 Secret 原文，只能看到名称和更新时间。

### 6.2 使用 GitHub CLI 配置

PowerShell 示例：

    $repo = "<owner>/<repo>"
    $hostName = "<VPS_HOST>"
    $port = "<VPS_PORT>"
    $user = "<VPS_USER>"
    $healthUrl = "https://<your-domain>/healthz"
    $keyPath = "$env:USERPROFILE/.ssh/uuyp_actions_deploy"

    gh secret set VPS_HOST --repo $repo --body $hostName
    gh secret set VPS_PORT --repo $repo --body $port
    gh secret set VPS_USER --repo $repo --body $user
    gh secret set VPS_HEALTHCHECK_URL --repo $repo --body $healthUrl
    Get-Content -Raw $keyPath | gh secret set VPS_SSH_KEY --repo $repo
    (ssh-keyscan.exe -p $port $hostName 2>$null) | gh secret set VPS_KNOWN_HOSTS --repo $repo

检查 Secret 是否存在：

    gh secret list --repo $repo

这个命令只列出名称和更新时间，不会打印 Secret 值。不要使用 echo、Write-Host 或日志输出私钥。

### 6.3 Repository secret 和 Environment secret 的区别

当前项目使用 Repository secrets，workflow 可以直接读取。

更安全的生产做法是创建 production Environment：

    仓库 Settings → Environments → New environment → production

然后把 6 个部署参数放到 production Environment，并在部署 job 中声明 production 环境。这样可以进一步配置：

- 必须由指定人员审批后才能部署。
- 只允许 main 分支使用该环境。
- 生产 Secret 与测试 Secret 分离。

如果改成 Environment secrets，workflow 必须显式写入 environment: production；只创建环境而不声明它，部署 job 仍然读不到其中的 Secret。

## 7. GHCR 镜像权限

Actions 使用 GitHub 自动提供的 GITHUB_TOKEN 登录 GHCR，所需权限是：

    contents: read
    packages: write

本项目构建并推送两个标签：

    ghcr.io/<owner>/<repo>:latest
    ghcr.io/<owner>/<repo>:<github.sha>

当前 GHCR 镜像可以由 VPS 直接拉取，因此 VPS 不保存 GHCR Token。

如果以后把 GHCR package 改成私有，VPS 需要一个只读的 Container Registry Token，并在 VPS 上执行 docker login。这个 Token 不能写进 workflow、Dockerfile 或命令行日志；能用短期凭据或专用只读凭据时，不要使用个人全权限 Token。

## 8. workflow 做了什么

当前 workflow 文件是：

    .github/workflows/deploy.yml

它的关键阶段如下：

1. checkout 仓库。
2. 安装 Python 3.11、uv 和后端依赖。
3. 执行后端 pytest。
4. 安装 Node 22 和前端依赖。
5. 执行前端 Vitest。
6. 执行 pip-audit 和 npm audit。
7. 在 Ubuntu runner 上用 Docker Buildx 构建 Linux 镜像。
8. 用 Trivy 检查高危和严重漏洞。
9. 登录 GHCR，推送 latest 和提交 SHA。
10. 用 ssh-agent 临时加载 VPS_SSH_KEY。
11. 将 VPS_KNOWN_HOSTS 写入临时 known_hosts，并强制 StrictHostKeyChecking=yes。
12. SSH 执行 .github/scripts/deploy-vps.sh。
13. 通过同一条 SSH 连接从 VPS 发起公网 HTTPS 健康检查。

workflow 只监听 main，是为了让生产部署入口清楚。Pull Request 可以运行检查，但不能因为任意开发分支更新就改动 VPS。

workflow 还配置了 concurrency。同一时间只运行一个生产部署任务，避免两个提交同时重建 uuyp 容器。

## 9. VPS 部署脚本做了什么

脚本文件是：

    .github/scripts/deploy-vps.sh

它的顺序是：

1. 拒绝不是完整 40 位 SHA 的 GHCR 镜像地址。
2. 读取当前 uuyp 容器使用的旧镜像。
3. docker pull 新镜像。
4. 删除旧 uuyp 容器并用固定端口、重启策略重新创建。
5. 轮询本地 /healthz、首页、首页引用的真实 JS/CSS 资源，并确认已知扫描路径返回 404，最多等待 30 次。
6. 以上检查全部成功就完成部署。
7. 创建失败或健康检查失败时，打印新容器日志。
8. 删除失败容器并恢复旧镜像。
9. 再次检查回滚容器；回滚也失败时让 Actions 明确失败。

部署脚本不会自动删除旧镜像，所以保留了回滚所需的镜像。长期运行后可以由管理员确认保留策略，再手动清理不用的旧镜像。

## 10. 第一次运行和验证

### 10.1 触发部署

确认改动已经进入 main 后，可以在 GitHub Actions 页面打开 Deploy，点击 Run workflow。

也可以使用 GitHub CLI：

    gh workflow run deploy.yml --repo <owner>/<repo> --ref main
    gh run list --workflow deploy.yml --repo <owner>/<repo> --limit 5

查看某次运行直到结束：

    gh run watch <run-id> --repo <owner>/<repo> --exit-status

### 10.2 在 VPS 验证

登录 VPS：

    ssh -p <VPS_PORT> <VPS_USER>@<VPS_HOST>

检查容器和实际镜像：

    docker ps --filter name=uuyp
    docker inspect --format '{{.Config.Image}}' uuyp

检查应用：

    curl --fail --silent --show-error http://127.0.0.1:8765/healthz
    curl --fail --silent --show-error http://127.0.0.1:8765/

从 VPS 检查公网入口：

    curl --fail --silent --show-error https://<your-domain>/healthz

成功时应看到包含 status 为 ok 的 JSON。只看到 GitHub 页面绿色还不够，至少要确认容器实际镜像、VPS 本地接口和公网接口。

## 11. 常见问题

| 现象 | 常见原因 | 检查方法 |
| --- | --- | --- |
| main 有提交但没有部署 | workflow 文件路径、Actions 被禁用、分支不是 main | 检查 Actions 页面和 deploy.yml 的 on.push.branches |
| Secret is required | Secret 名称拼写错误或放在了错误的环境 | 执行 gh secret list，逐个核对名称 |
| Permission denied publickey | 公钥没有写入正确用户，或私钥粘贴不完整 | 用同一私钥在本地执行 ssh 测试 |
| Host key verification failed | VPS_KNOWN_HOSTS 过期或端口错误 | 重新核对主机指纹和 SSH 端口 |
| docker pull denied | GHCR package 是私有的或镜像名错误 | 先在 VPS 手动确认镜像权限 |
| 新容器启动后回滚 | 应用没有监听 8765、静态构建缺失、健康接口或真实资源不健康 | 查看 docker logs uuyp |
| Actions runner 访问公网失败 | runner 到目标站点的网络或 TLS 路径不稳定 | 当前实现改为通过 SSH 让 VPS 自己 curl 公网地址 |
| 多次提交同时部署 | 前一次仍在运行 | 查看 concurrency，等待上一任务完成 |

不要为了让任务变绿而删除健康检查、改用 latest、关闭 SSH 主机校验或把 Token 打到日志中。

## 12. 安全清单

- 私钥只放在 GitHub Secret；不要提交到 Git、Issue、聊天、构建产物或 Docker 镜像。
- UUYP 登录 Token 与部署 SSH 密钥是两类凭据，都不能写进教程。
- Repository secret 的值不会在普通设置页面直接显示，但能修改 workflow 的人可能编写代码尝试使用它；限制仓库写权限，保护 main。
- 生产环境优先使用专用 deploy 用户、专用密钥和 production Environment 审批。
- Docker 权限接近 root 权限，部署用户只用于部署。
- 启用 main 分支保护和必须通过的检查。
- 不要在日志中使用 set -x，也不要 echo Secret。
- 第三方 Actions 生产环境可以进一步固定到完整 commit SHA，降低 tag 被替换的风险。
- 怀疑私钥泄露时，先从 VPS authorized_keys 删除旧公钥，再生成新密钥并更新 VPS_SSH_KEY。
- 怀疑 UUYP Token 泄露时，立即在服务端撤销并重新生成；Token 不需要参与 Docker 部署。

## 13. 本项目文件对应关系

| 文件 | 作用 |
| --- | --- |
| .github/workflows/deploy.yml | Actions 触发、测试、构建、扫描、推送和 SSH 部署 |
| .github/scripts/deploy-vps.sh | VPS 拉取、重建、健康检查和回滚 |
| docs/automated-deployment.md | 当前项目实际部署参数和简要说明 |
| Dockerfile | 构建生产镜像 |
| docs/github-actions-vps-deployment-guide.md | 本教程 |

本项目实际的非敏感部署参数以 GitHub Secrets 和现有部署文档为准。教程不重复粘贴当前私钥、UUYP Token 或其他凭据。

## 14. 最终检查表

配置完成后，逐项确认：

- [ ] 本地 SSH 私钥可以登录 VPS，并且该用户可以执行 docker ps。
- [ ] VPS_KNOWN_HOSTS 来自已核对的主机指纹。
- [ ] GitHub 中 6 个 Secret 名称完全匹配。
- [ ] GHCR package 的可见性与 VPS 拉取方式匹配。
- [ ] workflow 只在预期的 main 更新时部署。
- [ ] Actions 测试、审计、镜像扫描和部署全部成功。
- [ ] VPS 运行的是完整提交 SHA 对应的镜像。
- [ ] /healthz、首页、真实静态资源和扫描路径 404 的本地检查都成功。
- [ ] 失败部署时能看到回滚结果。
- [ ] 没有任何 Token、私钥或 Secret 出现在仓库和日志中。

如果只想了解当前项目已经做好的内容，可以先看 [自动部署说明](automated-deployment.md)；如果要从零配置或迁移到另一台 VPS，则按本教程执行。
