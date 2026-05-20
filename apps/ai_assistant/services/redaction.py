from __future__ import annotations

import re
import unicodedata
from collections.abc import Mapping, Sequence
from typing import Any


SENSITIVE_KEY_PARTS = {
    "authorization",
    "bearer",
    "cookie",
    "document",
    "email",
    "endereco",
    "address",
    "full_name",
    "iban",
    "ip",
    "morada",
    "nuit",
    "password",
    "phone",
    "secret",
    "senha",
    "telefone",
    "token",
    "traceback",
    "user_agent",
}

EMAIL_RE = re.compile(r"(?P<left>[\w.\-+%]{1,64})@(?P<right>[\w.\-]{1,255}\.[A-Za-z]{2,})")
LONG_TOKEN_RE = re.compile(r"\b[A-Za-z0-9_\-]{32,}\b")
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)")


def normalize_key(value: str) -> str:
    value = (value or "").strip().lower()
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn")


def is_sensitive_key(key: str | None) -> bool:
    normalized = normalize_key(str(key or ""))
    if not normalized:
        return False
    return any(part in normalized for part in SENSITIVE_KEY_PARTS)


def redact_text(value: str) -> str:
    text = str(value or "")
    if not text:
        return ""
    text = EMAIL_RE.sub("[email-redigido]", text)
    text = LONG_TOKEN_RE.sub("[segredo-redigido]", text)
    text = PHONE_RE.sub("[telefone-redigido]", text)
    return text


def redact_value(value: Any, *, key: str | None = None) -> Any:
    if is_sensitive_key(key):
        return "[redigido]"

    if isinstance(value, str):
        return redact_text(value)

    if isinstance(value, Mapping):
        return {str(item_key): redact_value(item_value, key=str(item_key)) for item_key, item_value in value.items()}

    if isinstance(value, Sequence) and not isinstance(value, (bytes, bytearray, str)):
        return [redact_value(item) for item in value]

    return value


def summarize_for_storage(value: Any, *, max_chars: int = 1200) -> str:
    text = redact_text(str(value or ""))
    if len(text) <= max_chars:
        return text
    return f"{text[:max_chars].rstrip()}..."
