"""Helpers para precificar consultas conforme horário, feriado e tenant TZ."""

from __future__ import annotations

from decimal import Decimal
from zoneinfo import ZoneInfo

from django.apps import apps
from django.utils import timezone

SCHEDULE_NORMAL = "NORMAL"
SCHEDULE_AFTER_HOURS = "FORA_EXPEDIENTE"
SCHEDULE_WEEKEND = "FIM_SEMANA"
SCHEDULE_MANUAL_HOLIDAY = "FERIADO_MANUAL"


def get_tenant_timezone(tenant):
    """Retorna a ZoneInfo do tenant ou None para usar o timezone padrão."""
    try:
        cfg = getattr(tenant, "configuracao", None)
        tz = (getattr(cfg, "time_zone", "") or "").strip()
        if not tz:
            return None
        return ZoneInfo(tz)
    except Exception:
        return None


def get_local_datetime(tenant, date_time):
    """Converte a data/hora para o timezone do tenant."""
    tz = get_tenant_timezone(tenant)
    if not date_time:
        return None
    if timezone.is_aware(date_time):
        return timezone.localtime(date_time, tz) if tz else timezone.localtime(date_time)
    return timezone.make_aware(date_time, tz) if tz else timezone.make_aware(date_time)


def is_holiday(tenant, date_time) -> bool:
    """Verifica se a data/hora informada cai em feriado cadastrado."""
    tenant_id = getattr(tenant, "id", None)
    if not tenant_id or not date_time:
        return False

    tz = get_tenant_timezone(tenant)
    if timezone.is_aware(date_time):
        local_date = timezone.localtime(date_time, tz).date() if tz else timezone.localtime(date_time).date()
    else:
        local_date = date_time.date()

    try:
        Holiday = apps.get_model("consultas", "Holiday")
    except LookupError:
        # Compatibilidade com snapshots antigos que referenciavam o nome PT.
        Holiday = apps.get_model("consultas", "Feriado")
    return Holiday.objects.filter(tenant_id=tenant_id, date=local_date, active=True).exists()


def calculate_schedule_type(tenant, date_time, manual_holiday: bool = False) -> str:
    """Classifica o horário (normal, fora de expediente, fim de semana ou feriado)."""
    dt_local = get_local_datetime(tenant, date_time)
    if not dt_local:
        return SCHEDULE_NORMAL

    if dt_local.weekday() >= 5:
        return SCHEDULE_WEEKEND

    if dt_local.hour >= 19 or dt_local.hour < 8:
        return SCHEDULE_AFTER_HOURS

    if manual_holiday:
        return SCHEDULE_MANUAL_HOLIDAY

    return SCHEDULE_NORMAL


def calculate_price_multiplier(tenant, date_time, manual_holiday: bool = False) -> Decimal:
    """Calcula multiplicador de preço com base em horário e feriados."""
    schedule_type = calculate_schedule_type(tenant, date_time, manual_holiday=manual_holiday)

    # 200% (2x) para fim de semana, fora de expediente ou feriado manual.
    if schedule_type in {SCHEDULE_WEEKEND, SCHEDULE_AFTER_HOURS, SCHEDULE_MANUAL_HOLIDAY}:
        return Decimal("2.00")

    # Mantem compatibilidade: feriado cadastrado em tabela tambem dobra.
    if is_holiday(tenant, date_time):
        return Decimal("2.00")

    return Decimal("1.00")


__all__ = [
    "SCHEDULE_AFTER_HOURS",
    "SCHEDULE_MANUAL_HOLIDAY",
    "SCHEDULE_NORMAL",
    "SCHEDULE_WEEKEND",
    "calculate_price_multiplier",
    "calculate_schedule_type",
    "get_local_datetime",
    "get_tenant_timezone",
    "is_holiday",
]
