from .apps import INSTALLED_APPS
from .auth import AUTH_PASSWORD_VALIDATORS
from .middleware import MIDDLEWARE
from .site import TEMPLATES, STATIC_URL


__all__ = [
    'INSTALLED_APPS',
    'AUTH_PASSWORD_VALIDATORS',
    'MIDDLEWARE',
    'TEMPLATES',
    'STATIC_URL'
]