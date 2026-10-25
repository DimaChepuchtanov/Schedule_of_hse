from pathlib import Path
from typing import Final, Any


WORD_DIR = Path(__file__).resolve().parent.parent

TEMPLATES: Final[tuple[dict[str, Any]]]= (
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [WORD_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
)

STATIC_URL = '/static/'
