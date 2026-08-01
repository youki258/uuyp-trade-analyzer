# Stage 1: 构建前端
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python 运行时
FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:0.11.12 /uv /uvx /bin/

WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/ ./backend/
COPY --from=frontend-build /app/static ./static

# 非 root 用户运行
RUN useradd -r -s /bin/false -d /tmp appuser && chown -R appuser:appuser /app
USER appuser

ENV HOME=/tmp
ENV UUYP_SESSION_COOKIE_NAME=uuyp_sid
ENV UUYP_SESSION_TTL_SECONDS=3600
ENV UUYP_SESSION_MAX_COUNT=100
ENV UUYP_ARTIFACT_TTL_SECONDS=1800
ENV UUYP_CLEANUP_INTERVAL_SECONDS=300
ENV UUYP_COOKIE_SECURE=true
ENV UUYP_COOKIE_SAMESITE=Strict

EXPOSE 8765

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD .venv/bin/python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8765/api/status')" || exit 1

CMD [".venv/bin/gunicorn", "-w", "4", "-b", "0.0.0.0:8765", "--timeout", "300", "backend.app:app"]
