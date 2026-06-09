from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.notifications.models.notification import Notification


def _notification():
    return Notification.objects.create(
        recipient=f"user{uuid4().hex[:5]}@ex.com",
        channel=Notification.Channel.EMAIL,
        message="Olá",
    )


@pytest.mark.django_db
def test_mark_sent_sets_flag_and_timestamp():
    notif = _notification()
    assert notif.sent is False

    notif.mark_sent(external_reference="MSG-1")
    assert notif.sent is True
    assert notif.sent_at is not None
    assert notif.external_reference == "MSG-1"
    assert notif.send_error == ""

    # Já enviada não pode ser reenviada.
    with pytest.raises(ValidationError):
        notif.mark_sent()


@pytest.mark.django_db
def test_mark_failed_records_error():
    notif = _notification()
    notif.mark_failed(error="Gateway timeout")
    assert notif.sent is False
    assert notif.send_error == "Gateway timeout"


@pytest.mark.django_db
def test_mark_failed_blocked_after_sent():
    notif = _notification()
    notif.mark_sent()
    with pytest.raises(ValidationError):
        notif.mark_failed(error="x")
