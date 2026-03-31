"""Helpers de data/hora (timezone awareness e limites mensais)."""

from datetime import UTC, datetime, timedelta


def ensure_aware(value):
    try:
        from django.utils import timezone
    except Exception:
        return value

    if isinstance(value, datetime) and timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return value


def month_bounds(reference=None):
    reference = reference or datetime.now(tz=UTC).date()
    start = reference.replace(day=1)
    next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    end = next_month - timedelta(days=1)
    return start, end
