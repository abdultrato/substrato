from __future__ import annotations

from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.monitoring.models.outbox_event import TransactionalOutboxEvent


def _dead_letter(event_type="test.event"):
    event = TransactionalOutboxEvent.objects.create(event_type=event_type)
    event.status = TransactionalOutboxEvent.Status.DEAD_LETTER
    event.attempts = 10
    event.last_error = "boom"
    event.available_at = timezone.now() - timezone.timedelta(hours=1)
    event.save(update_fields=["status", "attempts", "last_error", "available_at"])
    return event


@pytest.mark.django_db
def test_requeue_resets_budget_and_makes_available():
    event = _dead_letter()
    before = timezone.now()
    event.requeue()
    event.refresh_from_db()
    assert event.status == TransactionalOutboxEvent.Status.PENDING
    assert event.attempts == 0
    assert event.last_error == ""
    assert event.available_at >= before


@pytest.mark.django_db
def test_command_requeues_only_dead_letter():
    dead = _dead_letter("billing.invoice")
    pending = TransactionalOutboxEvent.objects.create(event_type="other.event")  # PENDING

    out = StringIO()
    call_command("requeue_dead_letter_outbox", stdout=out)

    dead.refresh_from_db()
    pending.refresh_from_db()
    assert dead.status == TransactionalOutboxEvent.Status.PENDING
    assert pending.status == TransactionalOutboxEvent.Status.PENDING  # já era
    assert "Recolocados 1" in out.getvalue()


@pytest.mark.django_db
def test_command_filters_by_event_type():
    keep = _dead_letter("type.a")
    other = _dead_letter("type.b")

    call_command("requeue_dead_letter_outbox", "--event-type", "type.a")

    keep.refresh_from_db()
    other.refresh_from_db()
    assert keep.status == TransactionalOutboxEvent.Status.PENDING
    assert other.status == TransactionalOutboxEvent.Status.DEAD_LETTER
