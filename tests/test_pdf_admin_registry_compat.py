from datetime import date

import pytest

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant
from tasks.generate_pdf.pdf_registry import PDF_GENERATORS_REGISTRY


def _tenant():
    return Tenant.objects.create(
        identifier="tn-pdf-admin-compat",
        name="Tenant PDF Admin Compat",
        domain="pdf-admin-compat.local",
        active=True,
    )


def _patient(tenant: Tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Compat PDF",
        gender="Masculino",
        address_street="Rua Compat",
        birth_date=date(1990, 1, 1),
    )


@pytest.mark.django_db
def test_patient_and_labrequest_generators_are_admin_signature_compatible():
    tenant = _tenant()
    patient = _patient(tenant)
    lab_request = LabRequest.objects.create(tenant=tenant, patient=patient)

    patient_generator = PDF_GENERATORS_REGISTRY.get("clinical", "patient")
    assert patient_generator is not None
    patient_pdf, patient_filename = patient_generator(patient, request=None)
    assert bytes(patient_pdf).startswith(b"%PDF")
    assert patient_filename.lower().endswith(".pdf")

    lab_request_generator = PDF_GENERATORS_REGISTRY.get("clinical", "labrequest")
    assert lab_request_generator is not None
    request_pdf, request_filename = lab_request_generator(lab_request, request=None)
    assert bytes(request_pdf).startswith(b"%PDF")
    assert request_filename.lower().endswith(".pdf")
