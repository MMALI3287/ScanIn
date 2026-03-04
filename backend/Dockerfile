FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as non-root to limit blast radius if the app is ever compromised
RUN addgroup --system appuser && adduser --system --ingroup appuser --no-create-home appuser

# Store torch model cache in an explicit path so the docker volume can target it
ENV TORCH_HOME=/app/.torch_cache
RUN mkdir -p /app/.torch_cache && chown appuser:appuser /app/.torch_cache

USER appuser

EXPOSE 8000

# 2 workers share the same process space via --preload (model loaded once before fork).
# Override worker count at runtime: docker run -e WEB_CONCURRENCY=4 ...
CMD ["sh", "-c", "gunicorn main:app -w ${WEB_CONCURRENCY:-2} -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --preload"]
