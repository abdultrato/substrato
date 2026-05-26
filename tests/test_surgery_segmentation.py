from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
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
    from api.v1.surgery.filters import FILTER_MAP
    from api.v1.surgery.serializers import SERIALIZER_MAP
    from api.v1.surgery.viewsets import VIEWSET_MAP

    expected = {"surgery", "small_surgery", "large_surgery", "surgical_procedure"}
    legacy = {"pequenacirurgia", "grandecirurgia", "procedimentocirurgico"}

    assert set(VIEWSET_MAP) == expected
    assert set(SERIALIZER_MAP) == expected
    assert set(FILTER_MAP) == expected
    assert not (set(VIEWSET_MAP) & legacy)


@pytest.mark.django_db
def test_surgery_api_uses_english_resource_routes(api_client):
    tenant = _tenant()
    user = _surgeon(tenant)
    admin_group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(admin_group)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)

    assert api_client.get("/api/v1/surgery/small_surgery/").status_code == 200
    assert api_client.get("/api/v1/surgery/pequenacirurgia/").status_code == 404
