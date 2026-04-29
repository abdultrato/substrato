from django.contrib import admin
from django.contrib.auth import get_user_model
import pytest

from apps.clinical.models.patient import Patient
from apps.surgery.models import LargeSurgery, SmallSurgery, Surgery
from apps.tenants.models.tenant import Tenant


def _tenant() -> Tenant:
    return Tenant.objects.create(
        identifier="tn-surgery-seg",
        name="Tenant Surgery Seg",
        domain="surgery-seg.local",
        active=True,
    )


def _patient(tenant: Tenant) -> Patient:
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Seg",
        gender="Masculino",
        address_street="Rua Seg",
    )


def _surgeon(tenant: Tenant):
    user_model = get_user_model()
    return user_model.objects.create_user(
        username="surgeon_seg",
        email="surgeon-seg@example.com",
        password="testpass123",
        tenant=tenant,
    )


@pytest.mark.django_db
def test_small_and_large_surgery_proxy_managers_filter_by_size():
    tenant = _tenant()
    patient = _patient(tenant)
    surgeon = _surgeon(tenant)

    small = Surgery.objects.create(
        tenant=tenant,
        patient=patient,
        surgeon=surgeon,
        procedure="Pequena cirurgia de teste",
        surgery_size=Surgery.Size.SMALL,
    )
    large = Surgery.objects.create(
        tenant=tenant,
        patient=patient,
        surgeon=surgeon,
        procedure="Grande cirurgia de teste",
        surgery_size=Surgery.Size.LARGE,
    )

    assert list(SmallSurgery.objects.values_list("id", flat=True)) == [small.id]
    assert list(LargeSurgery.objects.values_list("id", flat=True)) == [large.id]


@pytest.mark.django_db
def test_surgery_proxies_force_expected_size_on_save():
    tenant = _tenant()
    patient = _patient(tenant)
    surgeon = _surgeon(tenant)

    small = SmallSurgery(
        tenant=tenant,
        patient=patient,
        surgeon=surgeon,
        procedure="Proxy pequena",
        surgery_size=Surgery.Size.LARGE,
    )
    small.save()

    large = LargeSurgery(
        tenant=tenant,
        patient=patient,
        surgeon=surgeon,
        procedure="Proxy grande",
        surgery_size=Surgery.Size.SMALL,
    )
    large.save()

    assert small.surgery_size == Surgery.Size.SMALL
    assert large.surgery_size == Surgery.Size.LARGE


@pytest.mark.django_db
def test_surgery_proxy_models_are_registered_in_admin_site():
    registry = admin.site._registry

    assert SmallSurgery in registry
    assert LargeSurgery in registry


def test_surgery_viewset_map_exposes_segmented_resources():
    from api.v1.surgery.viewsets import VIEWSET_MAP

    assert "pequenacirurgia" in VIEWSET_MAP
    assert "grandecirurgia" in VIEWSET_MAP
