"""
Django production settings for Conflux application.
"""

from pathlib import Path
import environ
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env()
environ.Env.read_env(BASE_DIR.parent / '.env')

# Security secrets must come from the environment. Never commit fallback
# credentials or encryption keys to source control.
DEBUG = env.bool('DEBUG', default=False)
SECRET_KEY = env('SECRET_KEY')
ENCRYPTION_KEY = env('ENCRYPTION_KEY')

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

INSTALLED_APPS = [
    'django.contrib.admin', 'django.contrib.auth', 'django.contrib.contenttypes',
    'django.contrib.sessions', 'django.contrib.messages', 'django.contrib.staticfiles',
    'rest_framework', 'rest_framework_simplejwt', 'drf_spectacular',
    'apps.accounts', 'apps.authentication', 'apps.storage', 'apps.folders',
    'apps.files', 'apps.dashboard', 'apps.common', 'corsheaders',
]

MIDDLEWARE = [
    'apps.common.middleware.RequestIDMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.authentication.middleware.SessionActivityMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'dcs.urls'
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR.parent / 'templates', BASE_DIR / 'templates'],
    'APP_DIRS': True,
    'OPTIONS': {'context_processors': [
        'django.template.context_processors.request',
        'django.contrib.auth.context_processors.auth',
        'django.contrib.messages.context_processors.messages',
    ]},
}]
WSGI_APPLICATION = 'dcs.wsgi.application'

db_config = env.db('DATABASE_URL')
if 'postgresql' in db_config.get('ENGINE', ''):
    db_config.setdefault('OPTIONS', {})['connect_timeout'] = 10
    db_config['OPTIONS'].pop('schema', None)
DATABASES = {'default': db_config}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'
AUTHENTICATION_BACKENDS = [
    'apps.accounts.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.common.authentication.QueryParamJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day', 'user': '1000/day', 'forgot_password': '5/hour',
        'register': '10/hour', 'login': '15/hour', 'reset_password': '10/hour',
        'verify_email': '10/hour', 'resend_verification': '5/hour',
        'revoke_sessions': '5/hour',
    }
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Conflux Multi-Cloud Unified Storage API',
    'DESCRIPTION': 'OpenAPI 3.0 specification for Conflux backend API endpoints including Authentication, Virtual Filesystem, Storage Accounts, and Security Dashboard.',
    'VERSION': '1.0.0', 'SERVE_INCLUDE_SCHEMA': False,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID', default='')
GOOGLE_CLIENT_SECRET = env('GOOGLE_CLIENT_SECRET', default='')
# Mocking must be explicitly enabled; DEBUG alone must never activate a fake provider.
MOCK_GOOGLE_DRIVE = env.bool('MOCK_GOOGLE_DRIVE', default=False)
WORKSPACE_FOLDER_NAME = env('WORKSPACE_FOLDER_NAME', default='Conflux')

CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    'sync-quotas-every-30-minutes': {
        'task': 'apps.storage.tasks.sync_quotas_for_all_users',
        'schedule': crontab(minute='*/30'),
    },
}

CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=False)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:3000', 'http://127.0.0.1:3000', 'https://conflux-psi.vercel.app'
])
# Do not allow arbitrary hosted preview origins while credentials are enabled.
CORS_ALLOWED_ORIGIN_REGEXES = []
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[
    'http://localhost:3000', 'http://127.0.0.1:3000', 'https://conflux-psi.vercel.app'
])

if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=False)

LOGGING = {
    'version': 1, 'disable_existing_loggers': False,
    'formatters': {'verbose': {'format': '[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] %(message)s'}},
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'django': {'handlers': ['console'], 'level': 'INFO', 'propagate': True},
        'django.request': {'handlers': ['console'], 'level': 'ERROR', 'propagate': False},
        'apps': {'handlers': ['console'], 'level': 'DEBUG', 'propagate': False},
    },
}

EMAIL_BACKEND_DEFAULT = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
if not EMAIL_HOST_USER:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    EMAIL_HOST = 'localhost'; EMAIL_PORT = 25; EMAIL_USE_TLS = False; EMAIL_HOST_PASSWORD = ''
else:
    EMAIL_BACKEND = env('EMAIL_BACKEND', default=EMAIL_BACKEND_DEFAULT)
    EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
    EMAIL_PORT = env.int('EMAIL_PORT', default=587)
    EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
    EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
    EMAIL_TIMEOUT = env.int('EMAIL_TIMEOUT', default=5)

DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='Conflux <noreply@conflux.app>')
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:3000')

FEATURE_FLAGS = {
    'FEATURE_TRASH': True, 'FEATURE_PREVIEW': True, 'FEATURE_SEARCH': True,
    'FEATURE_FAVORITES': True, 'FEATURE_RECENT': True, 'FEATURE_DIAGNOSTICS': True,
    'FEATURE_DROPBOX': False, 'FEATURE_S3': False, 'FEATURE_CHUNK_UPLOAD': False,
}
