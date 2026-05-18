from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
import pytest

from events.base_event import BaseEvent
from events.runtime_bridge import (
    get_runtime,
    mirror_event_to_runtime,
    reset_runtime_bridge,
    serialize_event_for_runtime,
    sync_runtime_outbox,
)


@dataclass
class SampleDomainEvent:
    tenant_id: int
    total: Decimal
    happened_at: datetime


@pytest.fixture(autouse=True)
def _reset_bridge_runtime():
    reset_runtime_bridge()
    yield
    reset_runtime_bridge()


def test_serialize_event_for_runtime_from_base_event():
    event = BaseEvent(
        "PAYMENT_RECEIVED",
        {"amount": Decimal("12.40"), "effective_date": date(2026, 1, 15), "tenant_id": "tn-1"},
    )

    name, payload, tenant_id = serialize_event_for_runtime(event)

    assert name == "PAYMENT_RECEIVED"
    assert payload["amount"] == "12.40"
    assert payload["effective_date"] == "2026-01-15"
    assert tenant_id == "tn-1"


def test_serialize_event_for_runtime_from_dataclass():
    event = SampleDomainEvent(
        tenant_id=7,
        total=Decimal("99.90"),
        happened_at=datetime(2026, 5, 18, 12, 30, 45, tzinfo=UTC),
    )

    name, payload, tenant_id = serialize_event_for_runtime(event)

    assert name == "SampleDomainEvent"
    assert payload["total"] == "99.90"
    assert payload["happened_at"].startswith("2026-05-18T12:30:45")
    assert tenant_id == "7"


def test_mirror_event_and_sync_outbox(settings, tmp_path):
    settings.SUBSTRATO_OS_RUNTIME_ENABLED = True
    settings.SUBSTRATO_OS_RUNTIME_OFFLINE_ONLY = True
    settings.SUBSTRATO_OS_OUTBOX_PATH = str(tmp_path / "runtime-outbox.sqlite3")

    mirrored = mirror_event_to_runtime(BaseEvent("INVOICE_ISSUED", {"tenant_id": "tn-7", "value": "100.00"}))

    runtime = get_runtime()
    assert mirrored is True
    assert runtime.pending_outbox_events == 1
    assert len(runtime.event_stream.events) == 0

    replay_result = sync_runtime_outbox(retry_after_seconds=0)

    assert replay_result is not None
    assert replay_result.delivered == 1
    assert replay_result.remaining == 0
    assert runtime.event_stream.events[-1].name == "INVOICE_ISSUED"


def test_sync_substrato_outbox_command_when_runtime_disabled(settings, tmp_path):
    settings.SUBSTRATO_OS_RUNTIME_ENABLED = False
    settings.SUBSTRATO_OS_OUTBOX_PATH = str(tmp_path / "runtime-outbox.sqlite3")

    stdout = StringIO()
    call_command("sync_substrato_outbox", stdout=stdout)

    assert "runtime desativado" in stdout.getvalue().lower()
