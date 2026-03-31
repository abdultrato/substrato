import os
from pathlib import Path

# =========================================================
# PATH
# =========================================================

BASE_DIR = Path(__file__).resolve().parents[2]

LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.getenv("LOG_FORMAT", "json").lower()

if LOG_FORMAT not in ("verbose", "simple", "json"):
    LOG_FORMAT = "json"


# =========================================================
# FORMATTERS
# =========================================================

FORMATTERS = {
    "verbose": {
        "format": ("[%(asctime)s] %(levelname)s %(name)s %(message)s"),
    },
    "simple": {
        "format": "%(levelname)s %(message)s",
    },
    "json": {
        "format": (
            '{"time":"%(asctime)s",'
            '"level":"%(levelname)s",'
            '"logger":"%(name)s",'
            '"message":"%(message)s",'
            '"metodo":"%(metodo)s",'
            '"path":"%(path)s",'
            '"status":%(status_code)s,'
            '"duracao_ms":%(duracao_ms)s,'
            '"tenant_id":%(tenant_id)s,'
            '"user_id":%(user_id)s}'
        ),
    },
}


# =========================================================
# HANDLERS
# =========================================================

HANDLERS = {
    "console": {
        "class": "logging.StreamHandler",
        "formatter": LOG_FORMAT,
    },
    "file": {
        "class": "logging.handlers.RotatingFileHandler",
        "filename": LOG_DIR / "app.log",
        "maxBytes": 50 * 1024 * 1024,
        "backupCount": 5,
        "formatter": LOG_FORMAT,
        "encoding": "utf-8",
    },
    "errors": {
        "class": "logging.handlers.RotatingFileHandler",
        "filename": LOG_DIR / "errors.log",
        "maxBytes": 10 * 1024 * 1024,
        "backupCount": 5,
        "level": "ERROR",
        "formatter": LOG_FORMAT,
        "encoding": "utf-8",
    },
}


# =========================================================
# LOGGING CONFIG
# =========================================================

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": FORMATTERS,
    "handlers": HANDLERS,
    "loggers": {
        # Django base
        "django": {
            "handlers": ["console", "file"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        # HTTP 500 / erros
        "django.request": {
            "handlers": ["errors"],
            "level": "ERROR",
            "propagate": False,
        },
        # API
        "api": {
            "handlers": ["console", "file"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        # Auditoria multi-tenant
        "tenant_audit": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
        # Métricas
        "metrics": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
        # Celery workers
        "celery": {
            "handlers": ["console", "file"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        # Eventos de domínio (silenciar logs de registro no startup)
        "eventos": {
            "handlers": ["console", "file"],
            "level": "WARNING",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
}
"""Configuração de logging (handlers, formatters, loggers) do projeto."""
