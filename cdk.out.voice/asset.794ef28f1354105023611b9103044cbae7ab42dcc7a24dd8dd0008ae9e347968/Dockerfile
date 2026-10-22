# EasyLink phone agent. Built for linux/arm64 (Fargate Graviton).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

RUN useradd --create-home --uid 10001 agent

COPY pyproject.toml ./
COPY easylink_voice ./easylink_voice
RUN pip install .

USER agent
# Voice activity model, fetched at build time so calls don't wait for it.
RUN python -m easylink_voice.main download-files

# LiveKit agent server: health on :8081/ while it's registered with LiveKit.
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8081/', timeout=4).status == 200 else 1)"

CMD ["python", "-m", "easylink_voice.main", "start"]
