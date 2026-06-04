"""Small subset of drf-spectacular utilities used by the project.

This keeps development and CI checks running when the optional
``drf-spectacular`` dependency is not installed locally.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, TypeVar

T = TypeVar("T")


class OpenApiTypes:
    STR = "string"
    INT = "integer"
    NUMBER = "number"
    FLOAT = "number"
    BOOL = "boolean"
    DATE = "date"
    DATETIME = "date-time"
    UUID = "uuid"
    URI = "uri"
    BINARY = "binary"
    OBJECT = "object"
    ANY = "any"
    NONE = "none"


@dataclass
class OpenApiParameter:
    name: str
    type: Any = OpenApiTypes.STR
    location: str = "query"
    required: bool = False
    description: str | None = None
    enum: list[Any] | tuple[Any, ...] | None = None
    default: Any = None
    many: bool = False
    deprecated: bool = False
    style: str | None = None
    explode: bool | None = None
    response: bool = False

    QUERY = "query"
    PATH = "path"
    HEADER = "header"
    COOKIE = "cookie"


@dataclass
class OpenApiResponse:
    response: Any = None
    description: str = ""
    examples: list[Any] | None = None


@dataclass
class OpenApiExample:
    name: str
    value: Any = None
    external_value: str | None = None
    summary: str | None = None
    description: str | None = None
    request_only: bool = False
    response_only: bool = False
    parameter_only: tuple[str, str] | None = None
    media_type: str | None = None
    status_codes: list[str] | None = None


@dataclass
class OpenApiRequest:
    request: Any = None
    encoding: dict[str, Any] | None = None
    examples: list[Any] | None = None


@dataclass
class PolymorphicProxySerializer:
    component_name: str
    serializers: Any
    resource_type_field_name: str | None = None
    many: bool | None = None
    allow_null: bool = False


class OpenApiDeprecated:
    pass


def _store_metadata(target: T, **metadata: Any) -> T:
    existing = getattr(target, "_spectacular_annotation", {})
    if isinstance(existing, dict):
        existing = {**existing, **metadata}
    else:
        existing = metadata
    try:
        setattr(target, "_spectacular_annotation", existing)
    except Exception:
        pass
    return target


def extend_schema(*args: Any, **kwargs: Any) -> Callable[[T], T] | T:
    if args and callable(args[0]) and len(args) == 1 and not kwargs:
        return _store_metadata(args[0])

    def decorator(target: T) -> T:
        return _store_metadata(target, **kwargs)

    return decorator


def extend_schema_view(**kwargs: Any) -> Callable[[T], T]:
    def decorator(target: T) -> T:
        return _store_metadata(target, view_annotations=kwargs)

    return decorator


def extend_schema_field(field: Any) -> Callable[[T], T]:
    def decorator(target: T) -> T:
        return _store_metadata(target, field=field)

    return decorator


def extend_schema_serializer(*args: Any, **kwargs: Any) -> Callable[[T], T] | T:
    if args and callable(args[0]) and len(args) == 1 and not kwargs:
        return _store_metadata(args[0])

    def decorator(target: T) -> T:
        return _store_metadata(target, serializer=kwargs)

    return decorator


def inline_serializer(name: str, fields: dict[str, Any], **kwargs: Any) -> Any:
    from rest_framework import serializers

    return type(name, (serializers.Serializer,), {**fields, **kwargs})
