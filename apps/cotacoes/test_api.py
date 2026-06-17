from __future__ import annotations

from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model

from apps.tenants.models.tenant import Tenant


@pytest.fixture
def api(db):
    from rest_framework.test import APIClient

    tenant, _ = Tenant.objects.get_or_create(
        domain="localhost",
        defaults={"name": "Tenant API", "identifier": f"tn-{uuid4().hex[:8]}", "active": True},
    )
    if not tenant.active:
        tenant.active = True
        tenant.save(update_fields=["active"])
    User = get_user_model()
    user = User.objects.create_user(
        username=f"api-admin-{uuid4().hex[:8]}",
        password="x",
        is_superuser=True,
        is_staff=True,
        is_active=True,
        tenant=tenant,
    )
    client = APIClient(HTTP_HOST="localhost")
    client.force_authenticate(user=user)
    return client


BASE = "/api/v1/cotacoes"


def _create_quotation_with_item(api):
    resp = api.post(
        f"{BASE}/quotation/",
        {"fiscal_client_name": "Cliente API", "fiscal_client_nuit": "123"},
        format="json",
    )
    assert resp.status_code == 201, resp.content
    qid = resp.json()["id"]
    item = api.post(
        f"{BASE}/quotationitem/",
        {"quotation": qid, "description": "Serviço", "quantity": "2", "unit_price": "100.00"},
        format="json",
    )
    assert item.status_code == 201, item.content
    return qid


@pytest.mark.django_db
def test_search_ordering_fields_are_valid():
    from api.v1.cotacoes.viewsets import VIEWSET_MAP

    invalid = {}
    for key, vs in VIEWSET_MAP.items():
        bad = list(getattr(vs, "_invalid_search_fields", []) or []) + list(
            getattr(vs, "_invalid_ordering_fields", []) or []
        )
        if bad:
            invalid[key] = bad
    assert invalid == {}


@pytest.mark.django_db
def test_quotation_crud_and_totals(api):
    qid = _create_quotation_with_item(api)
    detail = api.get(f"{BASE}/quotation/{qid}/").json()
    assert detail["grand_total"] == "200.00"
    assert len(detail["items"]) == 1
    assert detail["status"] == "DRAFT"


@pytest.mark.django_db
def test_quotation_send_accept_and_number(api):
    qid = _create_quotation_with_item(api)
    sent = api.post(f"{BASE}/quotation/{qid}/send/", {}, format="json").json()
    assert sent["status"] == "SENT"
    assert sent["quotation_number"].startswith("COT-")
    accepted = api.post(f"{BASE}/quotation/{qid}/accept/", {}, format="json").json()
    assert accepted["status"] == "ACCEPTED"


@pytest.mark.django_db
def test_invalid_transition_returns_400(api):
    qid = _create_quotation_with_item(api)
    # DRAFT → accept não permitido
    resp = api.post(f"{BASE}/quotation/{qid}/accept/", {}, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_full_chain_via_api(api):
    qid = _create_quotation_with_item(api)
    api.post(f"{BASE}/quotation/{qid}/send/", {}, format="json")
    api.post(f"{BASE}/quotation/{qid}/accept/", {}, format="json")

    conv = api.post(f"{BASE}/quotation/{qid}/convert-to-proforma/", {}, format="json")
    assert conv.status_code == 201, conv.content
    pid = conv.json()["id"]
    assert conv.json()["status"] == "DRAFT"

    api.post(f"{BASE}/proforma/{pid}/send/", {}, format="json")
    api.post(f"{BASE}/proforma/{pid}/accept/", {}, format="json")
    inv = api.post(f"{BASE}/proforma/{pid}/convert-to-invoice/", {}, format="json")
    assert inv.status_code == 201, inv.content
    body = inv.json()
    assert body["status"] == "EMIT"  # Invoice.Status.ISSUED
    assert body["origin"] == "PRO"


@pytest.mark.django_db
def test_quotation_list_filter_by_status(api):
    _create_quotation_with_item(api)
    resp = api.get(f"{BASE}/quotation/", {"status": "DRAFT"})
    assert resp.status_code == 200
    body = resp.json()
    results = body["results"] if isinstance(body, dict) else body
    assert len(results) >= 1
