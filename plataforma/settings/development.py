from __future__ import annotations

import importlib.util
from pathlib import Path
import sys


def _ensure_project_platform_package() -> None:
    current = sys.modules.get("platform")
    current_file = str(getattr(current, "__file__", "") or "") if current is not None else ""
    if current_file.replace("/", "\\").endswith("\\platform\\__init__.py"):
        return

    repo_root = Path(__file__).resolve().parents[2]
    pkg_dir = repo_root / "platform"
    init_py = pkg_dir / "__init__.py"
    if not init_py.exists():
        return

    spec = importlib.util.spec_from_file_location(
        "platform",
        init_py,
        submodule_search_locations=[str(pkg_dir)],
    )
    if spec is None or spec.loader is None:
        return

    module = importlib.util.module_from_spec(spec)
    sys.modules["platform"] = module
    spec.loader.exec_module(module)


_ensure_project_platform_package()

from platform.settings.development import *  # noqa: E402,F403

