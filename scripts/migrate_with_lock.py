#!/usr/bin/env python3
"""
Aplica migrações Django com lock operacional para Postgres.

Motivação:
- Evita corrida quando múltiplas réplicas iniciam ao mesmo tempo.
- Mantém comportamento simples para SQLite/outros engines.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
import subprocess
import sys
import time

import psycopg

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LOCK_ID = 834217431
DEFAULT_WAIT_SECONDS = 180
DEFAULT_POLL_SECONDS = 2.0

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("migrate_with_lock")


def _run_manage_migrate() -> int:
    command = [sys.executable, "manage.py", "migrate", "--noinput"]
    logger.info(f"[migrate] executando: {' '.join(command)}")
    result = subprocess.run(command, cwd=REPO_ROOT, check=False)
    return result.returncode


def _is_postgres_engine() -> bool:
    engine = (os.getenv("DB_ENGINE") or "").strip().lower()
    return "postgres" in engine


def _get_int_env(name: str, default: int) -> int:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        logger.warning(f"[migrate] {name} inválido: {raw!r}. usando {default}.")
        return default


def _get_float_env(name: str, default: float) -> float:
    raw = (os.getenv(name) or "").strip()
    if not raw:
        return default
    try:
        value = float(raw)
    except ValueError:
        logger.warning(f"[migrate] {name} inválido: {raw!r}. usando {default}.")
        return default
    return value if value > 0 else default


def _connect_postgres():
    host = (os.getenv("DB_HOST") or "").strip()
    dbname = (os.getenv("DB_NAME") or "").strip()
    user = (os.getenv("DB_USER") or "").strip()
    password = os.getenv("DB_PASSWORD") or ""
    port = _get_int_env("DB_PORT", 5432)

    if not host or not dbname or not user:
        raise RuntimeError(
            "DB_HOST, DB_NAME e DB_USER são obrigatórios para lock de migração em Postgres."
        )

    conn = psycopg.connect(
        host=host,
        dbname=dbname,
        user=user,
        password=password,
        port=port,
        connect_timeout=10,
    )
    conn.autocommit = True
    return conn


def _run_with_advisory_lock() -> int:
    lock_id = _get_int_env("SUBSTRATO_MIGRATION_LOCK_ID", DEFAULT_LOCK_ID)
    wait_seconds = _get_int_env("SUBSTRATO_MIGRATION_LOCK_WAIT_SECONDS", DEFAULT_WAIT_SECONDS)
    poll_seconds = _get_float_env("SUBSTRATO_MIGRATION_LOCK_POLL_SECONDS", DEFAULT_POLL_SECONDS)

    deadline = time.monotonic() + max(wait_seconds, 1)
    logger.info(
        "[migrate] aguardando lock de migração "
        f"(id={lock_id}, timeout={wait_seconds}s, poll={poll_seconds}s)"
    )

    with _connect_postgres() as conn, conn.cursor() as cursor:
        acquired = False
        while time.monotonic() < deadline:
            cursor.execute("SELECT pg_try_advisory_lock(%s)", (lock_id,))
            acquired = bool(cursor.fetchone()[0])
            if acquired:
                break
            time.sleep(poll_seconds)

        if not acquired:
            logger.error("[migrate] timeout ao aguardar lock de migração.")
            return 1

        logger.info("[migrate] lock adquirido; aplicando migrações.")
        try:
            return _run_manage_migrate()
        finally:
            cursor.execute("SELECT pg_advisory_unlock(%s)", (lock_id,))
            logger.info("[migrate] lock liberado.")


def main() -> int:
    if not _is_postgres_engine():
        logger.info("[migrate] DB_ENGINE não é postgres; executando migração sem lock.")
        return _run_manage_migrate()

    try:
        return _run_with_advisory_lock()
    except Exception as exc:  # pragma: no cover - proteção operacional
        logger.error(f"[migrate] falha operacional: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
