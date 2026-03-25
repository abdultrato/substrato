from __future__ import annotations

import ast
from datetime import UTC
import importlib.util
import pkgutil


def _patch_legacy_ast_aliases() -> None:
    # Pytest/plugins antigos ainda referenciam aliases removidos no Python 3.14.
    legacy_aliases = {
        "Str": ast.Constant,
        "Bytes": ast.Constant,
        "Num": ast.Constant,
        "NameConstant": ast.Constant,
        "Ellipsis": ast.Constant,
    }
    for name, target in legacy_aliases.items():
        if not hasattr(ast, name):
            setattr(ast, name, target)

    if not hasattr(ast.Constant, "s"):
        ast.Constant.s = property(lambda self: self.value)
    if not hasattr(ast.Constant, "n"):
        ast.Constant.n = property(lambda self: self.value)


def _patch_pkgutil_find_loader() -> None:
    if hasattr(pkgutil, "find_loader"):
        return

    def find_loader(name: str):
        spec = importlib.util.find_spec(name)
        return None if spec is None else spec.loader

    pkgutil.find_loader = find_loader


def _patch_django_timezone_utc() -> None:
    try:
        from django.utils import timezone as django_timezone
    except Exception:
        return

    if not hasattr(django_timezone, "utc"):
        django_timezone.utc = UTC


_patch_legacy_ast_aliases()
_patch_pkgutil_find_loader()
_patch_django_timezone_utc()
