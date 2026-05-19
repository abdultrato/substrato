from __future__ import annotations

from importlib import import_module
from typing import Any


class StorageService:
    """Thin adapter to centralize file storage integrations."""

    @staticmethod
    def _load_backend(name: str) -> Any:
        if name == "s3":
            return import_module("integrations.storage.s3")
        if name == "backblaze":
            return import_module("integrations.storage.backblaze")
        raise ValueError(f"Unsupported storage backend: {name}")

    @classmethod
    def backend(cls, name: str = "s3") -> Any:
        return cls._load_backend(name)
