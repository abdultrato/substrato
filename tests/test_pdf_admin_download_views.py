from datetime import date

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.test import RequestFactory
import pytest

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.nursing.models.procedure import Procedure
from apps.tenants.models.tenant import Tenant
from tasks.generate_pdf.pdf_admin_mixin import SimplePDFAdminMixin


def _tenant():
    return Tenant.objects.create(
        identifier="tn-pdf-admin-view",
        name="Tenant PDF Admin View",
        domain="pdf-admin-view.local",
        active=True,
    )


def _superuser(tenant: Tenant):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin_pdf_download",
        email="admin-pdf-download@example.com",
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
        name="Paciente Admin PDF",
        gender="Masculino",
        address_street="Rua Admin PDF",
        birth_date=date(1991, 1, 1),
    )


def _admin_request(user):
    request = RequestFactory().get("/admin/test/download-pdf/")
    request.user = user
    request.META["HTTP_HOST"] = "pdf-admin-view.local"
    return request


def _admin_instance(model_cls):
    instance = admin.site._registry.get(model_cls)
    assert instance is not None, f"ModelAdmin não encontrado para {model_cls.__name__}"
    assert isinstance(instance, SimplePDFAdminMixin)
    return instance


@pytest.mark.django_db
def test_simple_pdf_admin_download_view_returns_pdf_for_registered_models():
    tenant = _tenant()
    user = _superuser(tenant)
    patient = _patient(tenant)
    lab_request = LabRequest.objects.create(tenant=tenant, patient=patient)
    result = Result.objects.create(tenant=tenant, request=lab_request)
    procedure = Procedure.objects.create(tenant=tenant, patient=patient)

    cases = [
        (Patient, patient),
        (LabRequest, lab_request),
        (Result, result),
        (Procedure, procedure),
    ]

    for model_cls, obj in cases:
        model_admin = _admin_instance(model_cls)
        response = model_admin.download_pdf_view(_admin_request(user), pk=obj.pk)

        assert response.status_code == 200
        assert "application/pdf" in response["Content-Type"]
        assert response["Content-Disposition"].lower().endswith(".pdf\"")

        pdf_bytes = b"".join(response.streaming_content)
        assert pdf_bytes.startswith(b"%PDF")


@pytest.mark.django_db
def test_simple_pdf_admin_button_is_rendered_on_first_load():
    tenant = _tenant()
    patient = _patient(tenant)
    lab_request = LabRequest.objects.create(tenant=tenant, patient=patient)
    result = Result.objects.create(tenant=tenant, request=lab_request)
    procedure = Procedure.objects.create(tenant=tenant, patient=patient)

    cases = [
        (Patient, patient),
        (LabRequest, lab_request),
        (Result, result),
        (Procedure, procedure),
    ]

    for model_cls, obj in cases:
        model_admin = _admin_instance(model_cls)
        model_admin.pdf_generator = None
        html = model_admin.get_pdf_button_html(obj)
        assert html != "—"
        assert "/download-pdf/" in str(html)
