"""Project package that also proxies the stdlib :mod:`platform` API.

This repository historically used ``platform`` as the Django package name.
That shadows Python's standard-library module of the same name, so third-party
packages importing ``platform`` would crash. We re-export the stdlib module
here while keeping ``platform.settings`` and the rest of the Django package
intact.
"""

from __future__ import annotations

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sysconfig


def _load_stdlib_platform():
    stdlib_path = Path(sysconfig.get_path("stdlib")) / "platform.py"
    spec = spec_from_file_location("_stdlib_platform", stdlib_path)
    if spec is None or spec.loader is None:
        return None

    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_stdlib_platform = _load_stdlib_platform()

if _stdlib_platform is not None:
    for name in dir(_stdlib_platform):
        if name.startswith("__"):
            continue
        globals().setdefault(name, getattr(_stdlib_platform, name))

    __all__ = list(getattr(_stdlib_platform, "__all__", []))
