"""
Django settings for roadwatch project.
Configured for RoadWatch: AI-Assisted Geospatial Road Condition Monitoring.
Uses PyMongo repository pattern for MongoDB persistence (no relational DB required).
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "roadwatch-insecure-dev-secret-key-2026-production-ready")

DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    # Minimal Django apps (excluding relational auth/contenttypes/sessions DB models)
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    
    # RoadWatch Apps
    "apps.core",
    "apps.authentication",
    "apps.complaints",
    "apps.geospatial",
    "apps.ai_service",
    "apps.maintenance",
    "apps.analytics",
    "apps.notifications",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "roadwatch.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
            ],
        },
    },
]

WSGI_APPLICATION = "roadwatch.wsgi.application"
ASGI_APPLICATION = "roadwatch.asgi.application"

# No default relational database needed for MongoDB repository architecture.
# We configure a dummy in-memory SQLite database if any internal Django tooling looks for DATABASES.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# MongoDB Configuration
MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DATABASE = os.environ.get("MONGODB_DATABASE", "roadwatch_db")

# Media Storage Configuration (Application-managed / Render persistent disk)
MEDIA_ROOT = os.environ.get("MEDIA_ROOT", str(BASE_DIR / "media"))
MEDIA_URL = "/api/v1/media/"
os.makedirs(MEDIA_ROOT, exist_ok=True)

# AI Service Configuration
AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://127.0.0.1:8001")

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", SECRET_KEY)
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", "72"))

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.authentication.jwt_auth.MongoDBJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "UNAUTHENTICATED_USER": None,
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
