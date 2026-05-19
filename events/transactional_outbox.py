from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import logging
from typing import Any
from uuid import UUID, uuid4

from django.conf import settings
from django.utils import timezone

from apps.monitoring.models import TransactionalOutboxEvent
from events.base_event import BaseEvent
from events.runtime_bridge import mirror_event_to_runtime, runtime_enabled, serialize_event_for_runtime

logger = logging.getLogger("eventos.transactional_outbox")


@dataclass(frozen=True, slots=True)
class OutboxDispatchResult:
    processed: int
    delivered: int
    failed: int
    dead_lettered: int
    remaining_pending: int


def outbox_enabled() -> bool:
    return bool(getattr(settings, "TRANSACTIONAL_OUTBOX_ENABLED", True))


def default_retry_after_seconds() -> int:
    return int(getattr(settings, "TRANSACTIONAL_OUTBOX_RETRY_AFTER_SECONDS", 30))


def default_max_attempts() -> int:
    return int(getattr(settings, "TRANSACTIONAL_OUTBOX_MAX_ATTEMPTS", 10))


def enqueue_event_for_outbox(event: Any, *, source: str = "django.event_bus") -> TransactionalOutboxEvent | None:
    """
    Persiste evento no outbox transacional.

    Mantém compatibilidade com eventos dataclass, BaseEvent e objetos de domínio.
    """

    if not outbox_enabled():
        return None

    event_type, payload, tenant_id = serialize_event_for_runtime(event)
    event_id = _extract_event_id(event)
    occurred_at = _extract_occurred_at(event)
    aggregate_id = _extract_aggregate_id(event=event, payload=payload)
    aggregate_version = _extract_aggregate_version(event=event, payload=payload)
    trace_id = _extract_trace_id(event=event, payload=payload)
    idempotency_key = _extract_idempotency_key(event=event, payload=payload, event_id=event_id)

    record, _ = TransactionalOutboxEvent.objects.get_or_create(
        event_id=event_id,
        defaults={
            "event_type": event_type,
            "payload": payload,
            "tenant_identifier": tenant_id,
            "aggregate_id": aggregate_id,
            "aggregate_version": aggregate_version,
            "trace_id": trace_id,
            "idempotency_key": idempotency_key,
            "source": source,
            "occurred_at": occurred_at,
            "available_at": timezone.now(),
            "status": TransactionalOutboxEvent.Status.PENDING,
        },
    )
    return record


def dispatch_pending_outbox_events(
    *,
    batch_size: int = 100,
    retry_after_seconds: int | None = None,
    max_attempts: int | None = None,
    force_runtime: bool = False,
) -> OutboxDispatchResult:
    """
    Despacha eventos pendentes para o runtime distribuído.
    """

    safe_retry_after = default_retry_after_seconds() if retry_after_seconds is None else int(retry_after_seconds)
    safe_max_attempts = default_max_attempts() if max_attempts is None else int(max_attempts)

    processed = delivered = failed = dead_lettered = 0
    now = timezone.now()

    records = list(
        TransactionalOutboxEvent.objects.filter(
            status__in=(TransactionalOutboxEvent.Status.PENDING, TransactionalOutboxEvent.Status.FAILED),
            available_at__lte=now,
        )
        .order_by("available_at", "id")[: max(1, int(batch_size))]
    )

    for record in records:
        processed += 1
        try:
            _deliver_record(record, force_runtime=force_runtime)
        except Exception as exc:
            failed += 1
            record.mark_failed(
                str(exc),
                retry_after_seconds=safe_retry_after,
                max_attempts=safe_max_attempts,
            )
            if record.status == TransactionalOutboxEvent.Status.DEAD_LETTER:
                dead_lettered += 1
        else:
            delivered += 1
            record.mark_delivered()

    remaining = TransactionalOutboxEvent.objects.filter(
        status__in=(TransactionalOutboxEvent.Status.PENDING, TransactionalOutboxEvent.Status.FAILED)
    ).count()

    return OutboxDispatchResult(
        processed=processed,
        delivered=delivered,
        failed=failed,
        dead_lettered=dead_lettered,
        remaining_pending=remaining,
    )


def runtime_dispatch_enabled(*, force: bool = False) -> bool:
    return runtime_enabled(force=force)


def _deliver_record(record: TransactionalOutboxEvent, *, force_runtime: bool = False) -> None:
    if not runtime_dispatch_enabled(force=force_runtime):
        raise RuntimeError("Runtime distribuído desativado")

    event = BaseEvent(
        nome=record.event_type,
        payload=record.payload,
    )
    event.identificador = str(record.event_id)
    event.ocorrido_em = record.occurred_at

    mirrored = mirror_event_to_runtime(
        event,
        force=force_runtime,
    )
    if not mirrored:
        raise RuntimeError("Falha ao espelhar evento para runtime distribuído")


def _extract_event_id(event: Any) -> UUID:
    candidate = None
    for attr in ("event_id", "identificador", "idempotency_key"):
        if hasattr(event, attr):
            candidate = getattr(event, attr)
            if candidate:
                break

    if candidate:
        try:
            return UUID(str(candidate))
        except (ValueError, TypeError):
            logger.debug("event_id inválido para outbox, gerando UUID novo", extra={"candidate": str(candidate)})
    return uuid4()


def _extract_occurred_at(event: Any) -> datetime:
    for attr in ("occurred_at", "ocorrido_em"):
        value = getattr(event, attr, None)
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=UTC)
    return timezone.now()


def _extract_aggregate_id(*, event: Any, payload: dict[str, Any]) -> str:
    for key in ("aggregate_id", "result_id", "request_id", "autorizacao_id", "authorization_id", "id"):
        value = payload.get(key)
        if value not in (None, ""):
            return str(value)

    for attr in ("aggregate_id", "result_id", "request_id", "autorizacao_id", "authorization_id", "id"):
        value = getattr(event, attr, None)
        if value not in (None, ""):
            return str(value)

    return ""


def _extract_aggregate_version(*, event: Any, payload: dict[str, Any]) -> int | None:
    for key in ("aggregate_version", "version", "versao"):
        value = payload.get(key)
        if value is not None:
            return _to_int_or_none(value)

    for attr in ("aggregate_version", "version", "versao"):
        value = getattr(event, attr, None)
        if value is not None:
            return _to_int_or_none(value)

    return None


def _extract_trace_id(*, event: Any, payload: dict[str, Any]) -> str:
    for key in ("trace_id", "request_id"):
        value = payload.get(key)
        if value:
            return str(value)

    for attr in ("trace_id", "request_id"):
        value = getattr(event, attr, None)
        if value:
            return str(value)

    return ""


def _extract_idempotency_key(*, event: Any, payload: dict[str, Any], event_id: UUID) -> str:
    for key in ("idempotency_key", "event_id"):
        value = payload.get(key)
        if value:
            return str(value)

    for attr in ("idempotency_key", "event_id", "identificador"):
        value = getattr(event, attr, None)
        if value:
            return str(value)

    return str(event_id)


def _to_int_or_none(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

