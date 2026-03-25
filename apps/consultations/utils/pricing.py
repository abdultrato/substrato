from __future__ import annotations

from decimal import Decimal
from zoneinfo import ZoneInfo

from django.apps import apps
from django.utils import timezone

HORARIO_NORMAL = "NORMAL"
HORARIO_FORA_EXPEDIENTE = "FORA_EXPEDIENTE"
HORARIO_FIM_SEMANA = "FIM_SEMANA"
HORARIO_FERIADO_MANUAL = "FERIADO_MANUAL"


def get_tenant_timezone(tenant):
    """
    Return the tenant ZoneInfo or None to use the default timezone.
    """
    try:
        cfg = getattr(tenant, "configuracao", None)
        tz = (getattr(cfg, "time_zone", "") or "").strip()
        if not tz:
            return None
        return ZoneInfo(tz)
    except Exception:
        return None


def get_local_datetime(tenant, date_hora):
    tz = get_tenant_timezone(tenant)
    if not date_hora:
        return None
    if timezone.is_aware(date_hora):
        return timezone.localtime(date_hora, tz) if tz else timezone.localtime(date_hora)
    return timezone.make_aware(date_hora, tz) if tz else timezone.make_aware(date_hora)


def is_feriado(tenant, date_hora) -> bool:
    tenant_id = getattr(tenant, "id", None)
    if not tenant_id or not date_hora:
        return False

    tz = get_tenant_timezone(tenant)
    if timezone.is_aware(date_hora):
        local_date = timezone.localtime(date_hora, tz).date() if tz else timezone.localtime(date_hora).date()
    else:
        local_date = date_hora.date()

    Holiday = apps.get_model("consultas", "Feriado")
    return Holiday.objects.filter(tenant_id=tenant_id, date=local_date, active=True).exists()


def calculate_schedule_type(tenant, date_hora, manual_holiday: bool = False) -> str:
    dt_local = get_local_datetime(tenant, date_hora)
    if not dt_local:
        return HORARIO_NORMAL

    if dt_local.weekday() >= 5:
        return HORARIO_FIM_SEMANA

    if dt_local.hour >= 19 or dt_local.hour < 8:
        return HORARIO_FORA_EXPEDIENTE

    if manual_holiday:
        return HORARIO_FERIADO_MANUAL

    return HORARIO_NORMAL


def calcular_price_multiplier(tenant, date_hora, manual_holiday: bool = False) -> Decimal:
    type = calculate_schedule_type(tenant, date_hora, manual_holiday=manual_holiday)

    # 200% (2x) para fim de semana, fora de expediente ou feriado manual.
    if type in {HORARIO_FIM_SEMANA, HORARIO_FORA_EXPEDIENTE, HORARIO_FERIADO_MANUAL}:
        return Decimal("2.00")

    # Mantem compatibilidade: feriado cadastrado em tabela tambem dobra.
    if is_feriado(tenant, date_hora):
        return Decimal("2.00")

    return Decimal("1.00")


obter_timezone_tenant = get_tenant_timezone
obter_datetime_local = get_local_datetime
calcular_schedule_type = calculate_schedule_type
