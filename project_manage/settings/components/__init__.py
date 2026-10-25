from .apps import INSTALLED_APPS
from .auth import AUTH_PASSWORD_VALIDATORS
from .middleware import MIDDLEWARE
from .site import TEMPLATES, STATIC_URL
from .database import DATABASES


__all__ = [
    'INSTALLED_APPS',
    'AUTH_PASSWORD_VALIDATORS',
    'MIDDLEWARE',
    'TEMPLATES',
    'STATIC_URL',
    'DATABASES'
]