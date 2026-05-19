from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
import re

MODULE_KEY_PATTERN = re.compile(r"^[a-z0-9_.-]+$")


class ModuleState(StrEnum):
    REGISTERED = "registered"
    LOADED = "loaded"
    FAILED = "failed"


class ModuleLoadError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class ModuleManifest:
    """
    Contract for installable runtime modules.
    """

    key: str
    version: str
    description: str = ""
    dependencies: tuple[str, ...] = ()
    permissions: tuple[str, ...] = ()
    entrypoint: Callable[[], None] | None = None

    def __post_init__(self) -> None:
        if not self.key or not MODULE_KEY_PATTERN.fullmatch(self.key):
            raise ValueError("Module key must match ^[a-z0-9_.-]+$")
        if not self.version:
            raise ValueError("Module version is required")


@dataclass(slots=True)
class ModuleRecord:
    manifest: ModuleManifest
    state: ModuleState = ModuleState.REGISTERED
    last_error: str | None = None


class ModuleRegistry:
    """
    Registry with dependency-aware loading for runtime modules.
    """

    def __init__(self) -> None:
        self._records: dict[str, ModuleRecord] = {}
        self._load_order: list[str] = []

    def register(self, manifest: ModuleManifest) -> None:
        if manifest.key in self._records:
            raise ValueError(f"Module already registered: {manifest.key}")
        self._records[manifest.key] = ModuleRecord(manifest=manifest)

    def is_registered(self, module_key: str) -> bool:
        return module_key in self._records

    def load(self, module_key: str) -> None:
        self._load_recursive(module_key=module_key, loading_stack=set())

    def load_all(self) -> None:
        for module_key in self._records:
            self.load(module_key)

    def state_of(self, module_key: str) -> ModuleState:
        return self._record_for(module_key).state

    def permissions_for(self, module_key: str) -> tuple[str, ...]:
        return self._record_for(module_key).manifest.permissions

    def has_permission(self, module_key: str, permission: str) -> bool:
        return permission in self.permissions_for(module_key)

    @property
    def load_order(self) -> tuple[str, ...]:
        return tuple(self._load_order)

    @property
    def manifests(self) -> tuple[ModuleManifest, ...]:
        return tuple(record.manifest for record in self._records.values())

    def _load_recursive(self, module_key: str, loading_stack: set[str]) -> None:
        record = self._record_for(module_key)
        if record.state is ModuleState.LOADED:
            return
        if module_key in loading_stack:
            raise ModuleLoadError(f"Circular dependency detected at module={module_key}")
        loading_stack.add(module_key)

        manifest = record.manifest
        for dependency_key in manifest.dependencies:
            if dependency_key not in self._records:
                raise ModuleLoadError(f"Missing dependency module={dependency_key} required_by={module_key}")
            self._load_recursive(module_key=dependency_key, loading_stack=loading_stack)

        try:
            if manifest.entrypoint:
                manifest.entrypoint()
        except Exception as exc:
            record.state = ModuleState.FAILED
            record.last_error = str(exc)
            raise ModuleLoadError(f"Failed to load module={module_key}: {exc}") from exc
        finally:
            loading_stack.remove(module_key)

        record.state = ModuleState.LOADED
        record.last_error = None
        if module_key not in self._load_order:
            self._load_order.append(module_key)

    def _record_for(self, module_key: str) -> ModuleRecord:
        record = self._records.get(module_key)
        if not record:
            raise ModuleLoadError(f"Unknown module: {module_key}")
        return record
