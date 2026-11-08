# Cloudflare Containers run linux/amd64 images.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY pyproject.toml ./
COPY scorer ./scorer
RUN pip install --no-cache-dir . && useradd --system --uid 10001 scorer

USER scorer
EXPOSE 8080
CMD ["uvicorn", "scorer.main:app", "--host", "0.0.0.0", "--port", "8080"]
