import os


def env_bool(name, default=False):
    """
    Converte variável de ambiente para boolean de forma segura.
    """
    value = os.getenv(name, str(default))
    return value.lower() in ("true", "1", "yes", "on")


def env_int(name, default):
    """
    Converte variável de ambiente para inteiro.
    """
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


# =========================================================
# SECURITY HEADERS
# =========================================================

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"


# =========================================================
# COOKIE SECURITY
# =========================================================

SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True


# =========================================================
# HTTPS
# =========================================================

SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)

# Necessário quando usa proxy (nginx / cloudflare / load balancer)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


# =========================================================
# HSTS
# =========================================================

SECURE_HSTS_SECONDS = env_int("SECURE_HSTS_SECONDS", 31536000)

SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", True)

SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", True)
"""Parâmetros de segurança adicionais (headers, proxies, etc.)."""
