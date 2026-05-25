from __future__ import annotations

from django.utils.functional import lazy
from django.utils.translation import get_language


def education_label(portuguese: str, english: str):
    """Return a lazy label that follows the active Django language."""

    def resolve() -> str:
        language = (get_language() or "pt").lower()
        return english if language.startswith("en") else portuguese

    return lazy(resolve, str)()
