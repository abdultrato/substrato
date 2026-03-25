from __future__ import annotations

import os
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parent


def _bootstrap_repo() -> None:
    root_str = str(ROOT)
    if root_str not in sys.path:
        sys.path.insert(0, root_str)

    # Keep imports deterministic for the local "platform" package.
    os.environ.setdefault("PYTHONPATH", root_str)

    # Import compatibility patches before pytest loads plugins.
    import sitecustomize  # noqa: F401

    # External plugin autoload is noisy in this environment; we only need pytest-django.
    os.environ.setdefault("PYTEST_DISABLE_PLUGIN_AUTOLOAD", "1")


def main(argv: list[str] | None = None) -> int:
    _bootstrap_repo()

    import pytest

    args = ["-p", "pytest_django.plugin", *(argv if argv is not None else sys.argv[1:])]
    return pytest.main(args)


if __name__ == "__main__":
    raise SystemExit(main())
