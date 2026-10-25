from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# config URL
ROOT_URLCONF = 'project_manage.urls'
WSGI_APPLICATION = 'manager.wsgi.application'

# Internationalization
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True