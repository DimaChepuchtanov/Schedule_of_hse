from urllib.parse import quote

from ..config import Config

redis_password = quote(Config.REDIS_PASSWORD, safe="")

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": (
            f"redis://:{redis_password}@"
            f"{Config.REDIS_HOST}:{Config.REDIS_PORT}/{Config.REDIS_DB}"
        ),
        "TIMEOUT": 3600,
        "KEY_PREFIX": "schedule_hse",
        "OPTIONS": {
            "socket_connect_timeout": 3,
            "socket_timeout": 3,
        },
    },
}
