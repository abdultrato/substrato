#!/usr/bin/env python3
"""
Gate de prontidão de produção para o Substrato.

Objetivo:
- Falhar rápido quando variáveis obrigatórias não estiverem definidas.
- Bloquear segredos fracos de produção.
- Executar `manage.py check --deploy` como validação final do Django.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
import subprocess
import sys

REQUIRED_VARS = (
    "DJANGO_SETTINGS_MODULE",
    "DJANGO_SECRET_KEY",
    "DJANGO_ALLOWED_HOSTS",
    "CORS_ALLOWED_ORIGINS",
    "CSRF_TRUSTED_ORIGINS",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD",
    "DB_HOST",
    "DB_PORT",
    "REDIS_URL",
)

WEAK_SECRET_MARKERS = ("django-insecure-", "change-me", "changeme", "example", "dummy")

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("production_readiness")


def _fail(message: str) -> None:
    logger.error(f"[FAIL] {message}")


def _ok(message: str) -> None:
    logger.info(f"[OK] {message}")


def _is_truthy(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def _validate_required_vars() -> bool:
    missing = [name for name in REQUIRED_VARS if not (os.getenv(name) or "").strip()]
    if missing:
        for var in missing:
            _fail(f"Variavel obrigatoria ausente: {var}")
        return False
    _ok("Variaveis obrigatorias definidas")
    return True


def _validate_production_flags() -> bool:
    checks_ok = True

    if _is_truthy(os.getenv("DJANGO_DEBUG", "false")):
        _fail("DJANGO_DEBUG deve ser False em producao")
        checks_ok = False
    else:
        _ok("DJANGO_DEBUG desativado")

    if not _is_truthy(os.getenv("USE_REDIS", "false")):
        _fail("USE_REDIS deve ser true em producao para escalabilidade")
        checks_ok = False
    else:
        _ok("USE_REDIS ativo")

    secret_key = (os.getenv("DJANGO_SECRET_KEY") or "").strip()
    normalized = secret_key.lower()
    if len(secret_key) < 50 or any(marker in normalized for marker in WEAK_SECRET_MARKERS):
        _fail("DJANGO_SECRET_KEY parece fraca para producao")
        checks_ok = False
    else:
        _ok("DJANGO_SECRET_KEY com formato aceitavel")

    try:
        session_idle_minutes = int((os.getenv("SESSION_IDLE_TIMEOUT_MINUTES") or "30").strip())
    except ValueError:
        _fail("SESSION_IDLE_TIMEOUT_MINUTES deve ser um inteiro")
        checks_ok = False
    else:
        if session_idle_minutes != 30:
            _fail("SESSION_IDLE_TIMEOUT_MINUTES deve ser 30 em producao")
            checks_ok = False
        else:
            _ok("Sessao expira apos 30 minutos de inatividade")

    if not _is_truthy(os.getenv("AUTH_COOKIE_SESSION_ONLY", "true")):
        _fail("AUTH_COOKIE_SESSION_ONLY deve ser true para exigir novo login ao fechar o navegador")
        checks_ok = False
    else:
        _ok("Cookies de autenticacao expiram ao fechar o navegador")

    return checks_ok


def _validate_csv_vars() -> bool:
    checks_ok = True
    for var_name in ("DJANGO_ALLOWED_HOSTS", "CORS_ALLOWED_ORIGINS", "CSRF_TRUSTED_ORIGINS"):
        entries = [item.strip() for item in (os.getenv(var_name) or "").split(",") if item.strip()]
        if not entries:
            _fail(f"{var_name} precisa de pelo menos um valor")
            checks_ok = False
        else:
            _ok(f"{var_name} com {len(entries)} valor(es)")
    return checks_ok


def _run_deploy_check() -> bool:
    repo_root = Path(__file__).resolve().parents[1]
    command = [sys.executable, "manage.py", "check", "--deploy"]

    env = os.environ.copy()
    env.setdefault("DJANGO_SETTINGS_MODULE", "platform.settings.production")
    env.setdefault("DJANGO_DEBUG", "False")
    env.setdefault("DB_ENGINE", "postgres")

    logger.info(f"[INFO] Executando: {' '.join(command)}")
    result = subprocess.run(command, cwd=repo_root, env=env, check=False)
    if result.returncode != 0:
        _fail("Django deploy check falhou")
        return False

    _ok("Django deploy check aprovado")
    return True


def main() -> int:
    logger.info("[INFO] Iniciando production readiness check")

    validators = (
        _validate_required_vars,
        _validate_production_flags,
        _validate_csv_vars,
        _run_deploy_check,
    )

    all_ok = True
    for validator in validators:
        if not validator():
            all_ok = False

    if not all_ok:
        logger.error("[RESULT] NOT READY")
        return 1

    logger.info("[RESULT] READY FOR PRODUCTION BASELINE")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
