from datetime import date

from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse
import pytest

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.nursing.models.procedure import Procedure
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(
        identifier="tn-pdf-admin-routes",
        name="Tenant PDF Admin Routes",
        domain="pdf-admin-routes.local",
        active=True,
    )


def _superuser(tenant: Tenant):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin_pdf_routes",
        email="admin-pdf-routes@example.com",
        password="testpass123",
        tenant=tenant,
    )
    user.is_staff = True
    user.is_superuser = True
    user.save(update_fields=["is_staff", "is_superuser"])
    return user


def _patient(tenant: Tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Admin Routes",
        gender="Masculino",
        address_street="Rua Admin Routes",
        birth_date=date(1990, 1, 1),
    )


@pytest.mark.django_db
def test_admin_download_pdf_urls_are_registered_and_return_pdf_for_superuser():
    tenant = _tenant()
    user = _superuser(tenant)
    patient = _patient(tenant)
    lab_request = LabRequest.objects.create(tenant=tenant, patient=patient)
    result = Result.objects.create(tenant=tenant, request=lab_request)
    procedure = Procedure.objects.create(tenant=tenant, patient=patient)

    client = Client()
    client.defaults["HTTP_HOST"] = tenant.domain
    client.force_login(user)

    cases = [
        (patient._meta.app_label, patient._meta.model_name, patient.pk),
        (lab_request._meta.app_label, lab_request._meta.model_name, lab_request.pk),
        (result._meta.app_label, result._meta.model_name, result.pk),
        (procedure._meta.app_label, procedure._meta.model_name, procedure.pk),
    ]

    for app_label, model_name, pk in cases:
        url = reverse(f"admin:{app_label}_{model_name}_download_pdf", args=[pk])
        response = client.get(url)

        assert response.status_code == 200, f"Falha em {url}"
        assert "application/pdf" in response["Content-Type"]
        assert response["Content-Disposition"].lower().endswith(".pdf\"")
        pdf_bytes = b"".join(response.streaming_content)
        assert pdf_bytes.startswith(b"%PDF")
