FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# En producción: docker build --build-arg REQUIREMENTS_FILE=requirements.txt
ARG REQUIREMENTS_FILE=requirements-dev.txt
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r "${REQUIREMENTS_FILE}"

# Usuario sin privilegios (nunca correr Django como root)
RUN useradd --create-home --uid 1000 riomarket \
    && chown -R riomarket:riomarket /app

COPY --chown=riomarket:riomarket . .

USER riomarket

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health/ || exit 1

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
