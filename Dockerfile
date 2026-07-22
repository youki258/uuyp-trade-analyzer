FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

# 非 root 用户运行
RUN useradd -r -s /bin/false appuser && chown -R appuser:appuser /app
USER appuser

ENV UUYP_SESSION_COOKIE_NAME=uuyp_sid
ENV UUYP_SESSION_TTL_SECONDS=3600
ENV UUYP_SESSION_MAX_COUNT=100
ENV UUYP_ARTIFACT_TTL_SECONDS=1800
ENV UUYP_CLEANUP_INTERVAL_SECONDS=300
ENV UUYP_COOKIE_SECURE=true
ENV UUYP_COOKIE_SAMESITE=Strict

EXPOSE 8765

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8765/api/status')" || exit 1

CMD ["uv", "run", "gunicorn", "-w", "4", "-b", "0.0.0.0:8765", "--timeout", "300", "app:app"]
