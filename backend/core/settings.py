"""
core/settings.py
-----------------
Yeh file Django project ki "control panel" hai — yahan decide hota hai
DB kaunsi use karni hai, WebSockets kaise chalengi (Channels), static
files kahan se serve honge, etc. Har block ke upar comment hai ki
WHY yeh setting free-tier + high-performance ke liye zaroori hai.
"""

import os
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv

load_dotenv()  # .env file se secrets load karta hai (never hardcode keys)

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-insecure-key")
DEBUG = os.getenv("DEBUG", "False") == "True"
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",        # <-- React frontend (Vercel, alag domain) se requests allow karne ke liye
    "channels",          # <-- yeh app WebSocket support enable karta hai
    "accounts",
    "tracker",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",   # SessionMiddleware se PEHLE hona zaroori hai
    "whitenoise.middleware.WhiteNoiseMiddleware",   # free static file serving
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ── THE MOST IMPORTANT LINE FOR REAL-TIME VIDEO ────────────────────────────
# Normal Django uses WSGI (one request -> one response -> connection closed).
# WebSockets need a connection that STAYS OPEN so video frames can stream
# both ways continuously. ASGI_APPLICATION tells Django "use the async
# server (Daphne) and route sockets through core/asgi.py".
ASGI_APPLICATION = "core.asgi.application"

# ── Channel Layer: how different WebSocket connections talk to each other ──
# In-memory layer = free, zero setup, perfect for single-server free-tier
# deployment (Render/Railway free instance = 1 worker anyway).
# If you scale to multiple servers later, swap to channels_redis (Upstash
# has a free Redis tier) — just uncomment the REDIS block below.
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}
# CHANNEL_LAYERS = {
#     "default": {
#         "BACKEND": "channels_redis.core.RedisChannelLayer",
#         "CONFIG": {"hosts": [os.getenv("REDIS_URL", "redis://localhost:6379")]},
#     }
# }

WSGI_APPLICATION = None  # hum pure ASGI use kar rahe hain, WSGI nahi

# ── Database: Supabase free Postgres (prod) / SQLite (local dev fallback) ──
_raw_db_url = os.getenv("DATABASE_URL", "")
DATABASES = {
    "default": dj_database_url.config(
        default=_raw_db_url or f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
        # sslmode sirf Postgres connections samajhte hain — sqlite (local dev)
        # ke saath yeh flag crash karta hai, isliye scheme check karke hi lagate hain
        ssl_require=_raw_db_url.startswith("postgres"),
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"   # generated PDF reports save yahan

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LOGIN_URL = "accounts:login"
LOGIN_REDIRECT_URL = "tracker:dashboard"

# ── AI Engine performance knobs (used inside tracker/ai_engine) ───────────
# Yeh settings frame-skip aur inference load control karte hain — isi se
# "no lag" guarantee milti hai even on average internet/CPU.
AI_ENGINE = {
    "PROCESS_EVERY_NTH_FRAME": 3,     # 3 frame me 1 process -> CPU load 1/3
    "JPEG_QUALITY": 60,               # client se aane wale frame ki quality
    "MAX_FRAME_WIDTH": 480,           # isse zyada bada frame server-side resize
    "INFERENCE_THREADPOOL_SIZE": 2,   # CNN + MediaPipe parallel me chalein
}

# ── CORS + cross-domain auth (React frontend Vercel pe, backend Render pe) ──
# Yeh dono ALAG domains hain, isliye teen cheezein zaroori hain:
#   1. CORS: browser ko batana ki Vercel domain se aayi requests allowed hain
#   2. CORS_ALLOW_CREDENTIALS: cookies (session/CSRF) cross-domain jaane do
#   3. SameSite=None + Secure: browser cookies ko cross-domain bhejne do
#      (SameSite=None sirf HTTPS pe kaam karta hai — isliye production me
#      DEBUG=False hote hi Secure=True ho jaata hai neeche)
_cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(",") if o.strip()]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS  # same list — React se POST karte waqt CSRF check pass karne ke liye

if not DEBUG:
    SESSION_COOKIE_SAMESITE = "None"
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SAMESITE = "None"
    CSRF_COOKIE_SECURE = True
# DEBUG=True (local dev) me SameSite=Lax hi rehta hai — localhost pe
# alag ports (5173 vs 8000) ko browsers "same-site" hi treat karte hain,
# isliye local testing me extra config ki zaroorat nahi padi (maine
# khud test karke confirm kiya hai).
