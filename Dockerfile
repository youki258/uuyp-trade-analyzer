FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

ENV UUYP_SESSION_COOKIE_NAME=uuyp_sid
ENV UUYP_SESSION_TTL_SECONDS=3600
ENV UUYP_SESSION_MAX_COUNT=100
ENV UUYP_ARTIFACT_TTL_SECONDS=1800
ENV UUYP_CLEANUP_INTERVAL_SECONDS=300
ENV UUYP_COOKIE_SECURE=false
ENV UUYP_COOKIE_SAMESITE=Strict

EXPOSE 8765

CMD ["uv", "run", "python", "app.py", "--host", "0.0.0.0", "--port", "8765"]
