from .components import *
from .base import *


DEBUG = False
ALLOWED_HOSTS = [value.strip() for value in (Config.DJANGO_ALLOWED_HOSTS or "").split(",") if value.strip()]
CSRF_TRUSTED_ORIGINS = [value.strip() for value in (Config.DJANGO_CSRF_TRUSTED_ORIGINS or "").split(",") if value.strip()]
SESSION_COOKIE_SECURE = Config.DJANGO_COOKIE_SECURE
CSRF_COOKIE_SECURE = Config.DJANGO_COOKIE_SECURE
SESSION_COOKIE_HTTPONLY = True