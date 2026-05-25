from __future__ import annotations

from typing import Any


def resolve_by_last_write(local_value: Any, remote_value: Any, remote_is_newer: bool) -> Any:
    return remote_value if remote_is_newer else local_value
