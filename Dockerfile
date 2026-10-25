FROM python:3.12.10-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN python -c "import sys; assert sys.version_info[:3] == (3, 12, 10)"

COPY requirements.txt ./
RUN python -m pip install -r requirements.txt

RUN groupadd --gid 1000 app \
    && useradd --uid 1000 --gid app --create-home app

COPY --chown=app:app . .
RUN mkdir -p /app/staticfiles && chown -R app:app /app

USER app
EXPOSE 8000

# The application command is defined in Docker Compose.
