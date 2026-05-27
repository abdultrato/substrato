from __future__ import annotations

import re
from collections import defaultdict

from rest_framework.schemas.openapi import SchemaGenerator as DRFSchemaGenerator


HTTP_METHODS = {"get", "post", "put", "patch", "delete", "head", "options", "trace"}
VERB_PREFIXES = (
    "partialUpdate",
    "retrieve",
    "destroy",
    "create",
    "update",
    "list",
)
METHOD_VERBS = {
    "post": "create",
    "put": "update",
    "patch": "partialUpdate",
    "delete": "destroy",
}


def _camel_segment(value: str) -> str:
    words = [part for part in re.split(r"[^0-9A-Za-z]+", value) if part]
    return "".join(word[:1].upper() + word[1:] for word in words)


def _verb_for_operation(method: str, path: str, operation_id: str) -> str:
    for prefix in VERB_PREFIXES:
        if operation_id.startswith(prefix):
            return prefix
    if method == "get":
        return "retrieve" if "{" in path else "list"
    return METHOD_VERBS.get(method, method.lower())


def _path_suffix(path: str) -> str:
    path = str(path or "").split("?", 1)[0].strip("/")
    parts = [part for part in path.split("/") if part]
    if parts[:2] == ["api", "v1"]:
        parts = parts[2:]

    suffix_parts: list[str] = []
    for part in parts:
        if part.startswith("{") and part.endswith("}"):
            suffix_parts.append(f"By{_camel_segment(part.strip('{}') or 'Id')}")
            continue
        suffix_parts.append(_camel_segment(part))

    return "".join(suffix_parts) or "Root"


def make_operation_id(method: str, path: str, operation_id: str) -> str:
    """Build a deterministic path-aware operationId.

    The compatibility shim delegates most schema generation to DRF. DRF derives
    operationIds mostly from serializer/model names, so aliases such as
    `/education/grade/` and `/education/assessment/` collide. This path-aware
    form keeps client generation deterministic without requiring every viewset
    alias to carry hand-written schema annotations.
    """

    verb = _verb_for_operation(method, path, operation_id)
    return f"{verb}{_path_suffix(path)}"


def ensure_unique_operation_ids(schema: dict) -> dict:
    paths = schema.get("paths") if isinstance(schema, dict) else None
    if not isinstance(paths, dict):
        return schema

    by_operation_id: dict[str, list[tuple[str, str, dict]]] = defaultdict(list)
    for path, path_item in paths.items():
        if not isinstance(path_item, dict):
            continue
        for method, operation in path_item.items():
            if method.lower() not in HTTP_METHODS or not isinstance(operation, dict):
                continue
            operation_id = operation.get("operationId")
            if isinstance(operation_id, str) and operation_id:
                by_operation_id[operation_id].append((method.lower(), str(path), operation))

    used: set[str] = set()
    for operation_id, operations in by_operation_id.items():
        if len(operations) == 1:
            used.add(operation_id)
            continue

        for method, path, operation in operations:
            candidate = make_operation_id(method, path, operation_id)
            if candidate in used:
                base = f"{candidate}{method[:1].upper()}{method[1:]}"
                candidate = base
                counter = 2
                while candidate in used:
                    candidate = f"{base}{counter}"
                    counter += 1
            operation["operationId"] = candidate
            used.add(candidate)

    return schema


class SchemaGenerator(DRFSchemaGenerator):
    def check_duplicate_operation_id(self, paths):
        # The compatibility shim fixes duplicates after DRF builds the schema.
        # Avoid noisy pre-deduplication warnings from the base generator.
        return None

    def get_schema(self, *args, **kwargs):
        schema = super().get_schema(*args, **kwargs)
        return ensure_unique_operation_ids(schema)
