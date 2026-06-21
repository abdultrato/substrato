"""Central generation of human-readable custom identifiers."""

from __future__ import annotations

import re

from django.db import transaction
from django.utils import timezone


CUSTOM_ID_SEQUENCE_DIGITS = 8
CUSTOM_ID_DATE_FORMAT = "%Y%m%d"


def normalize_custom_id_prefix(prefix: str) -> str:
    value = str(prefix or "").strip().upper()
    if not value:
        raise ValueError("custom_id prefix is required")
    return value


def custom_id_period() -> str:
    return timezone.now().strftime(CUSTOM_ID_DATE_FORMAT)


def format_custom_id(prefix: str, period: str, sequence_number: int) -> str:
    normalized_prefix = normalize_custom_id_prefix(prefix)
    return f"{normalized_prefix}-{period}/{sequence_number:0{CUSTOM_ID_SEQUENCE_DIGITS}d}"


def parse_custom_id_sequence(value: str, *, prefix: str, period: str) -> int | None:
    normalized_prefix = re.escape(normalize_custom_id_prefix(prefix))
    pattern = rf"^{normalized_prefix}-{re.escape(period)}/(\d{{{CUSTOM_ID_SEQUENCE_DIGITS}}})$"
    match = re.match(pattern, str(value or ""))
    if not match:
        return None
    return int(match.group(1))


def _identifier_manager(model):
    return getattr(model, "all_objects", None) or getattr(model, "_default_manager")


def generate_custom_id(prefix: str, model, *, period: str | None = None) -> str:
    """
    Generate the next code for a model using CONTEXT-AAAAMMDD/00000001.

    The sequence is scoped by model, prefix and date. Existing legacy formats are
    ignored so a model can move to the new format without data migration.
    """

    normalized_prefix = normalize_custom_id_prefix(prefix)
    current_period = period or custom_id_period()
    code_prefix = f"{normalized_prefix}-{current_period}/"
    manager = _identifier_manager(model)

    with transaction.atomic():
        queryset = (
            manager.select_for_update(skip_locked=True)
            .filter(custom_id__startswith=code_prefix)
            .order_by("-custom_id")
        )
        last_object = queryset.first()

        next_sequence = 1
        if last_object and last_object.custom_id:
            last_sequence = parse_custom_id_sequence(
                last_object.custom_id,
                prefix=normalized_prefix,
                period=current_period,
            )
            if last_sequence is not None:
                next_sequence = last_sequence + 1

        return format_custom_id(normalized_prefix, current_period, next_sequence)


__all__ = [
    "CUSTOM_ID_SEQUENCE_DIGITS",
    "custom_id_period",
    "format_custom_id",
    "generate_custom_id",
    "normalize_custom_id_prefix",
    "parse_custom_id_sequence",
]
