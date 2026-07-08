from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from uuid import uuid4
import pytest

from apps.clinical.models.patient import Patient
from apps.surgery.models import LargeSurgery, SmallSurgery, Surgery
from apps.tenants.models.tenant import Tenant


def _tenant() -> Tenant:
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-surgery-seg-{suffix}",
        name=f"Tenant Surgery Seg {suffix}",
        domain=f"surgery-seg-{suffix}.local",
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
    suffix = uuid4().hex[:8]
    return user_model.objects.create_user(
        username=f"surgeon_seg_{suffix}",
        email=f"surgeon-seg-{suffix}@example.com",
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

    assert list(SmallSurgery.objects.filter(tenant=tenant).values_list("id", flat=True)) == [small.id]
    assert list(LargeSurgery.objects.filter(tenant=tenant).values_list("id", flat=True)) == [large.id]


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

    # O módulo de cirurgia foi expandido com mais recursos (agenda, materiais,
    # faturação, etc.); aqui garantimos que os recursos segmentados continuam
    # expostos em todos os mapas e que os nomes legados não reaparecem.
    assert expected <= set(VIEWSET_MAP)
    assert expected <= set(SERIALIZER_MAP)
    assert expected <= set(FILTER_MAP)
    assert set(VIEWSET_MAP) == set(SERIALIZER_MAP) == set(FILTER_MAP)
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


@pytest.mark.django_db
def test_large_surgery_api_rejects_updates_after_marked_performed(api_client):
    from rest_framework.test import APIRequestFactory, force_authenticate
    from api.v1.surgery.viewsets import LargeSurgeryViewSet

    tenant = _tenant()
    patient = _patient(tenant)
    user = _surgeon(tenant)
    admin_group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(admin_group)
    surgery = Surgery.objects.create(
        tenant=tenant,
        patient=patient,
        surgeon=user,
        procedure="Grande cirurgia bloqueada",
        surgery_size=Surgery.Size.LARGE,
        status=Surgery.Status.SURGERY_COMPLETED,
    )

    request = APIRequestFactory().patch(
        f"/api/v1/surgery/large_surgery/{surgery.id}/",
        {"procedure": "Alteração indevida"},
        format="json",
        HTTP_HOST=tenant.domain,
    )
    force_authenticate(request, user=user)
    view = LargeSurgeryViewSet.as_view({"patch": "partial_update"})

    response = view(request, pk=surgery.id)

    surgery.refresh_from_db()
    assert response.status_code == 400
    assert surgery.procedure == "Grande cirurgia bloqueada"


@pytest.mark.django_db
def test_large_surgery_can_be_referred_to_ward_after_marked_performed(api_client):
    from rest_framework.test import APIRequestFactory, force_authenticate
    from api.v1.surgery.viewsets import LargeSurgeryViewSet

    tenant = _tenant()
    patient = _patient(tenant)
    user = _surgeon(tenant)
    admin_group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(admin_group)
    surgery = Surgery.objects.create(
        tenant=tenant,
        patient=patient,
        surgeon=user,
        procedure="Grande cirurgia para enfermaria",
        surgery_size=Surgery.Size.LARGE,
        status=Surgery.Status.SURGERY_COMPLETED,
    )

    request = APIRequestFactory().post(
        f"/api/v1/surgery/large_surgery/{surgery.id}/encaminhar-enfermaria/",
        {},
        format="json",
        HTTP_HOST=tenant.domain,
    )
    force_authenticate(request, user=user)
    view = LargeSurgeryViewSet.as_view({"post": "encaminhar_enfermaria"})

    response = view(request, pk=surgery.id)

    surgery.refresh_from_db()
    assert response.status_code == 200
    assert surgery.ward_referral_requested_at is not None
