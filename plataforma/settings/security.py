# settings/security.py

import os

SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True") == "True"

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"

SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", 31536000))
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# =========================================================
# CSRF TRUSTED ORIGINS
# =========================================================

origins = os.getenv("CSRF_TRUSTED_ORIGINS")

CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in origins.split(",") if origin.strip()] if origins else []
