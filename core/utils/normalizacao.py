"""Funções de normalização de texto e dígitos."""

import re
import unicodedata


def normalize_digits(value):
    return re.sub(r"\D", "", value or "")


def normalize_text(value):
    text = unicodedata.normalize("NFKD", str(value or ""))
    ascii_text = text.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", ascii_text).strip().lower()
