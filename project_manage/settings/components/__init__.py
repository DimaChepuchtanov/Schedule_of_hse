from .apps import INSTALLED_APPS
from .auth import AUTH_PASSWORD_VALIDATORS, AUTH_USER_MODEL
from .cache import CACHES
from .database import DATABASES
from .middleware import MIDDLEWARE
from .rest import REST_FRAMEWORK
from .site import STATIC_ROOT, STATIC_URL, STATICFILES_DIRS, TEMPLATES
from .swagger import SPECTACULAR_SETTINGS

__all__ = [
    "INSTALLED_APPS",
    "AUTH_PASSWORD_VALIDATORS",
    "AUTH_USER_MODEL",
    "MIDDLEWARE",
    "TEMPLATES",
    "STATIC_URL",
    "STATIC_ROOT",
    "STATICFILES_DIRS",
    "DATABASES",
    "SPECTACULAR_SETTINGS",
    "REST_FRAMEWORK",
    "CACHES",
]
