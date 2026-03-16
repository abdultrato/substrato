"""
Utilitarios e views de sistema.

Importante: este pacote nao e um Django app. Evitamos imports "eager" de
submodulos que registram models (ex.: `sistema.modelos`) para nao quebrar
ferramentas como `python manage.py test` durante discovery.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any

from .backup import BackupDatabaseView
from .limitacao import AnonBurstRateThrottle, BurstRateThrottle, SustainedRateThrottle
from .maintenance import ativar, desativar, esta_ativo
from .sistema import SystemInfoView
from .tarefas import BackgroundTasksView

_LAZY_MODULES: dict[str, str] = {
    "api": "sistema.api",
    "middleware": "sistema.middleware",
    "modelos": "sistema.modelos",
    "service": "sistema.service",
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
    "modelos",
    "service",
]
