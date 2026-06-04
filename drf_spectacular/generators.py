"""Schema generator compatibility backed by Django REST Framework."""

from __future__ import annotations

from collections import defaultdict
import re
from typing import Any

_ACTION_PREFIXES = (
    "partialUpdate",
    "list",
    "retrieve",
    "create",
    "update",
    "destroy",
)


def _pascal(value: str) -> str:
    parts = re.split(r"[^0-9A-Za-z]+", value)
    return "".join(part[:1].upper() + part[1:] for part in parts if part)


def _path_suffix(path: str) -> str:
    segments = [segment for segment in path.strip("/").split("/") if segment]
    normalized: list[str] = []
    for segment in segments:
        if segment in {"api", "v1", "v2"}:
            continue
        if segment.startswith("{") and segment.endswith("}"):
            name = segment.strip("{}").replace("_pk", "").replace("_id", "")
            normalized.append(f"by-{name}")
        else:
            normalized.append(segment)
    return _pascal("-".join(normalized))


def _operation_prefix(operation_id: str, method: str) -> str:
    for prefix in _ACTION_PREFIXES:
        if operation_id.startswith(prefix):
            return prefix
    return {
        "get": "retrieve",
        "post": "create",
        "put": "update",
        "patch": "partialUpdate",
        "delete": "destroy",
    }.get(method.lower(), method.lower())


def ensure_unique_operation_ids(schema: dict[str, Any]) -> None:
    operations: list[tuple[str, str, dict[str, Any]]] = []
    for path, path_item in (schema.get("paths") or {}).items():
        if not isinstance(path_item, dict):
            continue
        for method, operation in path_item.items():
            if not isinstance(operation, dict):
                continue
            operation_id = operation.get("operationId")
            if operation_id:
                operations.append((path, method, operation))

    grouped: dict[str, list[tuple[str, str, dict[str, Any]]]] = defaultdict(list)
    for item in operations:
        grouped[str(item[2]["operationId"])].append(item)

    used = {str(operation["operationId"]) for _, _, operation in operations}
    for operation_id, duplicates in grouped.items():
        if len(duplicates) < 2:
            continue
        used.discard(operation_id)
        for path, method, operation in duplicates:
            base = f"{_operation_prefix(operation_id, method)}{_path_suffix(path)}"
            candidate = base
            counter = 2
            while candidate in used:
                candidate = f"{base}{counter}"
                counter += 1
            operation["operationId"] = candidate
            used.add(candidate)


class SchemaGenerator:
    def __init__(
        self,
        title: str | None = None,
        url: str | None = None,
        description: str | None = None,
        patterns: Any = None,
        urlconf: Any = None,
        version: str | None = None,
        **kwargs: Any,
    ) -> None:
        self.title = title
        self.url = url
        self.description = description
        self.patterns = patterns
        self.urlconf = urlconf
        self.version = version
        self.kwargs = kwargs

    def get_schema(self, request: Any = None, public: bool = False) -> dict[str, Any]:
        from rest_framework.schemas.openapi import SchemaGenerator as DRFSchemaGenerator

        generator = DRFSchemaGenerator(
            title=self.title,
            url=self.url,
            description=self.description,
            patterns=self.patterns,
            urlconf=self.urlconf,
            version=self.version,
        )
        schema = generator.get_schema(request=request, public=public)
        if isinstance(schema, dict):
            ensure_unique_operation_ids(schema)
        return schema
