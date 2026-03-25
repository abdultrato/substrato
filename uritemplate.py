from __future__ import annotations

import re

_VARIABLE_RE = re.compile(r"{([^}]+)}")


def variables(template: str) -> list[str]:
    if not template:
        return []

    names: list[str] = []
    for raw in _VARIABLE_RE.findall(template):
        name = raw.split(":", 1)[0].split("*", 1)[0].strip()
        if name:
            names.append(name)
    return names
