"""
Utilitarios e views de system.

Importante: este pacote nao e um Django app. Evitamos imports "eager" de
submodulos que registram models (ex.: `system.modelos`) para nao quebrar
ferramentas como `python manage.py test` durante discovery.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any

from .backup import BackupDatabaseView
from .limitacao import AnonBurstRateThrottle, BurstRateThrottle, SustainedRateThrottle
from .maintenance import ativar, desativar, esta_ativo
from .system import SystemInfoView
from .tasks import BackgroundTasksView

_LAZY_MODULES: dict[str, str] = {
    "api": "system.api",
    "middleware": "system.middleware",
    "models": "system.models",
    "service": "system.services",
}


def __getattr__(name: str) -> Any:
    module_path = _LAZY_MODULES.get(name)
    if module_path is None:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

    module = import_module(module_path)
    globals()[name] = module
    return module


def __dir__() -> list[str]:
    return sorted([*globals().keys(), *_LAZY_MODULES.keys()])


__all__ = [
    "AnonBurstRateThrottle",
    "BackgroundTasksView",
    "BackupDatabaseView",
    "BurstRateThrottle",
    "SustainedRateThrottle",
    "SystemInfoView",
    "api",
    "ativar",
    "desativar",
    "esta_ativo",
    "middleware",
    "models",
    "service",
]
