from datetime import datetime

import pytest
from django.utils import timezone

from apps.tenants.models import Tenant
from core.identity.custom_id import format_custom_id, parse_custom_id_sequence


def _fixed_now():
    return timezone.make_aware(datetime(2026, 6, 21, 10, 30, 0))


def test_custom_id_format_matches_context_date_and_eight_digit_sequence():
    code = format_custom_id("REQ", "20260621", 1)

    assert code == "REQ-20260621/00000001"
    assert parse_custom_id_sequence(code, prefix="REQ", period="20260621") == 1


@pytest.mark.django_db
def test_identifier_mixin_generates_daily_incrementing_custom_id(monkeypatch):
    monkeypatch.setattr("core.identity.custom_id.timezone.now", _fixed_now)

    first = Tenant.objects.create(identifier="tn-custom-id-001", name="Tenant Custom ID 1")
    second = Tenant.objects.create(identifier="tn-custom-id-002", name="Tenant Custom ID 2")
    first_sequence = parse_custom_id_sequence(first.custom_id, prefix="TN", period="20260621")
    second_sequence = parse_custom_id_sequence(second.custom_id, prefix="TN", period="20260621")

    assert first.custom_id.startswith("TN-20260621/")
    assert second.custom_id.startswith("TN-20260621/")
    assert first_sequence is not None
    assert second_sequence == first_sequence + 1
    assert first.id_custom == first.custom_id
