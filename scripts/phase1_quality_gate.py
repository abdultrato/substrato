#!/usr/bin/env python3
"""Local quality gate for Substrato phase 1 and 2 work.

Default mode is intentionally fast enough for frequent local use. Use --full
before publishing larger changes.
"""

from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path
import shutil
import subprocess
import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIR = REPO_ROOT / "frontend-next"
PHASE_PYTHON_SURFACES = [
    "api/v1/permissions.py",
    "platform/settings/base.py",
    "scripts/phase1_quality_gate.py",
    "scripts/production_readiness_check.py",
    "tests/test_auth_session_cookie_policy.py",
    "tests/test_phase1_phase2_baseline.py",
]

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("phase1_quality_gate")


def _base_env() -> dict[str, str]:
    env = os.environ.copy()
    env.setdefault("DJANGO_SETTINGS_MODULE", "plataforma.settings.development")
    env.setdefault("DJANGO_SECRET_KEY", "substrato-local-quality-gate-secret-not-for-production-1234567890")
    env.setdefault("DB_ENGINE", "sqlite")
    env.setdefault("USE_REDIS", "false")
    return env


def _resolve_command(command: list[str]) -> list[str] | None:
    executable = command[0]
    if executable == sys.executable:
        return command
    resolved = shutil.which(executable)
    if not resolved:
        return None
    return [resolved, *command[1:]]


def _run(label: str, command: list[str], *, cwd: Path = REPO_ROOT, env: dict[str, str] | None = None) -> bool:
    resolved = _resolve_command(command)
    if not resolved:
        logger.info("[SKIP] %s: comando indisponivel (%s)", label, command[0])
        return True

    logger.info("\n[RUN] %s", label)
    logger.info("%s", " ".join(command))
    run_kwargs = {
        "cwd": cwd,
        "env": env or _base_env(),
        "check": False,
    }
    if os.name == "nt" and resolved[0].lower().endswith((".cmd", ".bat")):
        result = subprocess.run(subprocess.list2cmdline(resolved), shell=True, **run_kwargs)
    else:
        result = subprocess.run(resolved, **run_kwargs)
    if result.returncode == 0:
        logger.info("[OK] %s", label)
        return True

    logger.error("[FAIL] %s (exit %s)", label, result.returncode)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Executa o gate local das fases 1 e 2.")
    parser.add_argument(
        "--full",
        action="store_true",
        help="Executa tambem testes/build completos do frontend e pytest completo.",
    )
    parser.add_argument(
        "--strict-ruff",
        action="store_true",
        help="Inclui Ruff repo-wide. Pode falhar por divida antiga fora da fase atual.",
    )
    args = parser.parse_args()

    env = _base_env()
    checks: list[tuple[str, list[str], Path]] = [
        ("Django system check", [sys.executable, "manage.py", "check"], REPO_ROOT),
        (
            "Migration drift check",
            [sys.executable, "manage.py", "makemigrations", "--check", "--dry-run"],
            REPO_ROOT,
        ),
        (
            "Ruff scoped lint",
            [sys.executable, "-m", "ruff", "check", "--no-fix", *PHASE_PYTHON_SURFACES],
            REPO_ROOT,
        ),
        (
            "Security/session baseline tests",
            [
                sys.executable,
                "-m",
                "pytest",
                "tests/test_auth_session_cookie_policy.py",
                "tests/test_phase1_phase2_baseline.py",
                "-q",
            ],
            REPO_ROOT,
        ),
        ("Frontend lint", ["npm", "--prefix", "frontend-next", "run", "lint", "--", "--max-warnings=0"], REPO_ROOT),
        ("Frontend type-check", ["npm", "--prefix", "frontend-next", "run", "type-check"], REPO_ROOT),
    ]

    if args.full:
        checks.extend(
            [
                ("Backend tests", [sys.executable, "-m", "pytest", "--maxfail=1"], REPO_ROOT),
                ("Frontend tests", ["npm", "run", "test", "--", "--run"], FRONTEND_DIR),
                ("Frontend build", ["npm", "run", "build"], FRONTEND_DIR),
            ]
        )

    if args.strict_ruff:
        checks.append(("Ruff full backend lint", [sys.executable, "-m", "ruff", "check", ".", "--no-fix"], REPO_ROOT))

    ok = True
    for label, command, cwd in checks:
        if not _run(label, command, cwd=cwd, env=env):
            ok = False

    if ok:
        logger.info("\n[RESULT] PHASE 1/2 BASELINE OK")
        return 0

    logger.error("\n[RESULT] PHASE 1/2 BASELINE FAILED")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
