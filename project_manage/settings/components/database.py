from __future__ import annotations

from typing import Final, Any

from ..config import Config

# Database
# https://docs.djangoproject.com/en/6.1/ref/settings/#databases

DATABASES: Final[dict[str, dict[str, Any]]] = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': Config.PG_DATABASE,
        'USER': Config.PG_USER,
        'PASSWORD': Config.PG_PASSWORD,
        'HOST': Config.PG_HOST,
        'PORT': Config.PG_PORT,
    }
}