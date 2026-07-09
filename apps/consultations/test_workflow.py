from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from api.v1.consultations.viewsets import MedicalConsultationViewSet
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.clinical.models import Patient
from apps.human_resources.models import Employee
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-cons-{suffix}",
        name="Tenant Cons",
        domain=f"tn-cons-{suffix}.testserver",
    )


def _specialty(tenant, *, active=True):
    return ConsultationSpecialty.objects.create(
        tenant=tenant, name=f"Cardiologia {uuid4().hex[:4]}",
        base_price=Decimal("1500.00"), vat_percentage=Decimal("0.00"), active=active,
    )


@pytest.mark.django_db
def test_specialty_deactivate_then_activate():
    tenant = _tenant()
    specialty = _specialty(tenant)
    assert specialty.active is True

    specialty.deactivate()
    specialty.refresh_from_db()
    assert specialty.active is False

    specialty.activate()
    specialty.refresh_from_db()
    assert specialty.active is True


@pytest.mark.django_db
def test_specialty_deactivate_is_idempotent():
    tenant = _tenant()
    specialty = _specialty(tenant, active=False)
    specialty.deactivate()
    specialty.refresh_from_db()
    assert specialty.active is False


@pytest.mark.django_db
def test_consultation_search_covers_order_patient_doctor_creator_and_date():
    tenant = _tenant()
    suffix = uuid4().hex[:8]
    user = get_user_model().objects.create_user(
        username=f"marcador.consulta.{suffix}",
        email=f"marcador.consulta.{suffix}@example.test",
        password="123456",
        first_name="Maria",
        last_name="Marcadora",
        tenant=tenant,
    )
    patient = Patient.objects.create(tenant=tenant, name="Paciente Pesquisa Consulta")
    doctor = Employee.objects.create(tenant=tenant, name="Doutor Busca Consulta")
    specialty = _specialty(tenant)
    scheduled_for = timezone.datetime(2026, 7, 8, 13, 45, tzinfo=timezone.get_current_timezone())
    consultation = MedicalConsultation.objects.create(
        tenant=tenant,
        patient=patient,
        doctor=doctor,
        specialty=specialty,
        type=specialty.name,
        scheduled_for=scheduled_for,
        price=Decimal("1500.00"),
        created_by=user,
    )

    for term in [
        str(consultation.id),
        consultation.custom_id,
        patient.name,
        doctor.name,
        "Maria Marcadora",
        "2026-07-08",
    ]:
        request = APIRequestFactory().get(
            "/api/v1/consultations/consultation/",
            {"search": term},
            HTTP_HOST=tenant.domain,
        )
        request.tenant = tenant
        force_authenticate(request, user=user)
        response = MedicalConsultationViewSet.as_view({"get": "list"})(request)
        response.render()
        assert response.status_code == 200
        results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        assert any(item["id"] == consultation.id for item in results)
        assert any(item.get("created_by_name") == "Maria Marcadora" for item in results)
