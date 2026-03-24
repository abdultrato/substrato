from __future__ import annotations

from decimal import Decimal
from zoneinfo import ZoneInfo

from django.apps import apps
from django.utils import timezone

HORARIO_NORMAL = "NORMAL"
HORARIO_FORA_EXPEDIENTE = "FORA_EXPEDIENTE"
HORARIO_FIM_SEMANA = "FIM_SEMANA"
HORARIO_FERIADO_MANUAL = "FERIADO_MANUAL"


def obter_timezone_inquilino(inquilino):
    """
    Retorna ZoneInfo do tenant (ou None para timezone default).
    """
    try:
        cfg = getattr(inquilino, "configuracao", None)
        tz = (getattr(cfg, "fuso_horario", "") or "").strip()
        if not tz:
            return None
        return ZoneInfo(tz)
    except Exception:
        return None


def obter_datetime_local(inquilino, data_hora):
    tz = obter_timezone_inquilino(inquilino)
    if not data_hora:
        return None
    if timezone.is_aware(data_hora):
        return timezone.localtime(data_hora, tz) if tz else timezone.localtime(data_hora)
    return timezone.make_aware(data_hora, tz) if tz else timezone.make_aware(data_hora)


def is_feriado(inquilino, data_hora) -> bool:
    inquilino_id = getattr(inquilino, "id", None)
    if not inquilino_id or not data_hora:
        return False

    tz = obter_timezone_inquilino(inquilino)
    if timezone.is_aware(data_hora):
        local_date = timezone.localtime(data_hora, tz).date() if tz else timezone.localtime(data_hora).date()
    else:
        local_date = data_hora.date()

    Holiday = apps.get_model("consultas", "Feriado")
    return Holiday.objects.filter(inquilino_id=inquilino_id, data=local_date, ativo=True).exists()


def calcular_tipo_horario(inquilino, data_hora, feriado_manual: bool = False) -> str:
    dt_local = obter_datetime_local(inquilino, data_hora)
    if not dt_local:
        return HORARIO_NORMAL

    if dt_local.weekday() >= 5:
        return HORARIO_FIM_SEMANA

    if dt_local.hour >= 19 or dt_local.hour < 8:
        return HORARIO_FORA_EXPEDIENTE

    if feriado_manual:
        return HORARIO_FERIADO_MANUAL

    return HORARIO_NORMAL


def calcular_multiplicador_preco(inquilino, data_hora, feriado_manual: bool = False) -> Decimal:
    tipo = calcular_tipo_horario(inquilino, data_hora, feriado_manual=feriado_manual)

    # 200% (2x) para fim de semana, fora de expediente ou feriado manual.
    if tipo in {HORARIO_FIM_SEMANA, HORARIO_FORA_EXPEDIENTE, HORARIO_FERIADO_MANUAL}:
        return Decimal("2.00")

    # Mantem compatibilidade: feriado cadastrado em tabela tambem dobra.
    if is_feriado(inquilino, data_hora):
        return Decimal("2.00")

    return Decimal("1.00")
