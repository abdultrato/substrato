from __future__ import annotations


class OpenApiTypes:
    INT = int
    STR = str
    DATETIME = str
    BINARY = bytes
    OBJECT = dict


class OpenApiParameter:
    QUERY = "query"
    PATH = "path"
    HEADER = "header"

    def __init__(
        self,
        name: str,
        type: object | None = None,
        location: str | None = None,
        description: str | None = None,
        required: bool | None = None,
        **kwargs,
    ) -> None:
        self.name = name
        self.type = type
        self.location = location
        self.description = description
        self.required = required
        self.extra = kwargs

class OpenApiResponse:
    def __init__(self, response: object | None = None, description: str | None = None, **kwargs) -> None:
        self.response = response
        self.description = description
        self.extra = kwargs


def extend_schema(*args, **kwargs):
    def decorator(obj):
        return obj

    return decorator
