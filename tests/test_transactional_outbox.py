from __future__ import annotations

from io import StringIO

from django.core.management import call_command
import pytest

from apps.monitoring.models import TransactionalOutboxEvent
from events.base_event import BaseEvent
from events.bus import event_bus
from events.runtime_bridge import reset_runtime_bridge
from events.transactional_outbox import dispatch_pending_outbox_events, enqueue_event_for_outbox


@pytest.fixture(autouse=True)
def _reset_runtime_bridge_fixture():
    reset_runtime_bridge()
    yield
    reset_runtime_bridge()


@pytest.mark.django_db
def test_publish_after_commit_persists_transactional_outbox(monkeypatch, settings):
    settings.TRANSACTIONAL_OUTBOX_ENABLED = True

    monkeypatch.setattr("events.bus.transaction.on_commit", lambda callback: callback())

    event_bus.publish_after_commit(
        BaseEvent(
            "PAYMENT_RECEIVED",
            {"tenant_id": "tn-outbox", "amount": "150.00"},
        )
    )

    record = TransactionalOutboxEvent.objects.get(event_type="PAYMENT_RECEIVED")
    assert record.tenant_identifier == "tn-outbox"
    assert record.status == TransactionalOutboxEvent.Status.PENDING
    assert record.payload["amount"] == "150.00"


@pytest.mark.django_db
def test_dispatch_pending_outbox_events_marks_delivered(settings, tmp_path):
    settings.TRANSACTIONAL_OUTBOX_ENABLED = True
    settings.SUBSTRATO_OS_RUNTIME_ENABLED = True
    settings.SUBSTRATO_OS_RUNTIME_OFFLINE_ONLY = False
    settings.SUBSTRATO_OS_OUTBOX_PATH = str(tmp_path / "runtime-dispatch.sqlite3")

    enqueue_event_for_outbox(
        BaseEvent("INVOICE_ISSUED", {"tenant_id": "tn-1", "invoice_id": 10, "value": "90.00"})
    )

    result = dispatch_pending_outbox_events(
        batch_size=50,
        retry_after_seconds=0,
        max_attempts=3,
    )

    record = TransactionalOutboxEvent.objects.get(event_type="INVOICE_ISSUED")
    assert result.processed == 1
    assert result.delivered == 1
    assert result.failed == 0
    assert record.status == TransactionalOutboxEvent.Status.DELIVERED
    assert record.published_at is not None


@pytest.mark.django_db
def test_dispatch_transactional_outbox_command_when_runtime_disabled(settings):
    settings.SUBSTRATO_OS_RUNTIME_ENABLED = False

    stdout = StringIO()
    call_command("dispatch_transactional_outbox", stdout=stdout)

    assert "runtime distribuído desativado" in stdout.getvalue().lower()

