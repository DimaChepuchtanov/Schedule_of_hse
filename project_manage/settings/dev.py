from .components import *
from .base import *

from .config import Config

DEBUG = True

ALLOWED_HOSTS = [
    value.strip()
    for value in Config.DJANGO_ALLOWED_HOSTS.split(",")
    if value.strip()
]

CSRF_TRUSTED_ORIGINS = [
    value.strip()
    for value in Config.DJANGO_CSRF_TRUSTED_ORIGINS.split(",")
    if value.strip()
]

COOKIE_SECURE = Config.DJANGO_COOKIE_SECURE
SESSION_COOKIE_SECURE = COOKIE_SECURE
CSRF_COOKIE_SECURE = COOKIE_SECURE
SESSION_COOKIE_HTTPONLY = True