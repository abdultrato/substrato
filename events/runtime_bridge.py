from __future__ import annotations

from dataclasses import asdict, is_dataclass
from datetime import date, datetime, time
from decimal import Decimal
from functools import lru_cache
import logging
from pathlib import Path
from typing import Any

from django.conf import settings

from substrato_os.offline import OutboxReplayResult
from substrato_os.runtime import SubstratoRuntime

logger = logging.getLogger("eventos.runtime_bridge")


def runtime_enabled(*, force: bool = False) -> bool:
    if force:
        return True
    return bool(getattr(settings, "SUBSTRATO_OS_RUNTIME_ENABLED", False))


def runtime_offline_only() -> bool:
    return bool(getattr(settings, "SUBSTRATO_OS_RUNTIME_OFFLINE_ONLY", False))


@lru_cache(maxsize=1)
def get_runtime() -> SubstratoRuntime:
    configured = getattr(settings, "SUBSTRATO_OS_OUTBOX_PATH", "")
    outbox_path = Path(str(configured)) if configured else Path("substrato_os_outbox.sqlite3")
    return SubstratoRuntime(outbox_path=outbox_path)


def reset_runtime_bridge() -> None:
    get_runtime.cache_clear()


def serialize_event_for_runtime(event: Any) -> tuple[str, dict[str, Any], str | None]:
    event_name = str(event.nome) if hasattr(event, "nome") else type(event).__name__

    payload: dict[str, Any]
    if hasattr(event, "payload") and isinstance(event.payload, dict):
        payload = _to_runtime_value(event.payload)
    elif is_dataclass(event):
        payload = _to_runtime_value(asdict(event))
    elif isinstance(event, dict):
        payload = _to_runtime_value(event)
    elif hasattr(event, "__dict__"):
        event_dict = {key: value for key, value in vars(event).items() if not key.startswith("_")}
        payload = _to_runtime_value(event_dict)
    else:
        payload = {"value": _to_runtime_value(event)}

    tenant_id = _extract_tenant_id(event=event, payload=payload)
    return event_name, payload, tenant_id


def mirror_event_to_runtime(
    event: Any,
    *,
    offline: bool | None = None,
    force: bool = False,
) -> bool:
    if not runtime_enabled(force=force):
        return False

    try:
        event_name, payload, tenant_id = serialize_event_for_runtime(event)
        get_runtime().publish_event(
            name=event_name,
            payload=payload,
            tenant_id=tenant_id,
            source="django.event_bus",
            offline=runtime_offline_only() if offline is None else offline,
        )
    except Exception:
        logger.exception("Falha ao espelhar evento para o runtime distribuído")
        return False
    return True


def sync_runtime_outbox(
    *,
    batch_size: int = 100,
    retry_after_seconds: int = 30,
    force: bool = False,
) -> OutboxReplayResult | None:
    if not runtime_enabled(force=force):
        return None
    return get_runtime().sync_outbox(
        batch_size=batch_size,
        retry_after_seconds=retry_after_seconds,
    )


def _extract_tenant_id(event: Any, payload: dict[str, Any]) -> str | None:
    for key in ("tenant_id", "inquilino_id", "tenant_identifier"):
        value = payload.get(key)
        if value is not None:
            return str(value)

    tenant_value = payload.get("tenant")
    tenant_id = _normalize_tenant_value(tenant_value)
    if tenant_id:
        return tenant_id

    for attr_name in ("tenant_id", "inquilino_id", "tenant"):
        if hasattr(event, attr_name):
            value = getattr(event, attr_name)
            tenant_id = _normalize_tenant_value(value)
            if tenant_id:
                return tenant_id
    return None


def _normalize_tenant_value(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (str, int)):
        return str(value)
    if hasattr(value, "identifier"):
        tenant_identifier = value.identifier
        if tenant_identifier:
            return str(tenant_identifier)
    if hasattr(value, "id"):
        tenant_id = value.id
        if tenant_id:
            return str(tenant_id)
    if hasattr(value, "pk"):
        tenant_pk = value.pk
        if tenant_pk:
            return str(tenant_pk)
    return None


def _to_runtime_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): _to_runtime_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_runtime_value(item) for item in value]
    if is_dataclass(value):
        return _to_runtime_value(asdict(value))
    if hasattr(value, "pk"):
        primary_key = getattr(value, "pk", None)
        if primary_key is not None:
            return primary_key
    return str(value)
