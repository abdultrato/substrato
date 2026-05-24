from datetime import date

import pytest

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
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
def test_clinical_admin_generators_are_signature_compatible():
    tenant = _tenant()
    patient = _patient(tenant)
    lab_request = LabRequest.objects.create(tenant=tenant, patient=patient)
    result = Result.objects.create(tenant=tenant, request=lab_request)

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

    result_generator = PDF_GENERATORS_REGISTRY.get("clinical", "result")
    assert result_generator is not None
    result_pdf, result_filename = result_generator(result, request=None)
    assert bytes(result_pdf).startswith(b"%PDF")
    assert result_filename.lower().endswith(".pdf")

    labresult_generator = PDF_GENERATORS_REGISTRY.get("clinical", "labresult")
    assert labresult_generator is not None
    legacy_pdf, legacy_filename = labresult_generator(lab_request, request=None)
    assert bytes(legacy_pdf).startswith(b"%PDF")
    assert legacy_filename.lower().endswith(".pdf")


def test_specific_generators_are_available_via_runtime_alias_labels():
    checks = [
        ("enfermagem", "procedure", "tasks.generate_pdf.procedure_pdf_generator"),
        ("faturamento", "invoice", "tasks.generate_pdf.invoice_pdf_generator"),
        ("farmacia", "movement", "tasks.generate_pdf.pharmacy_reports_pdf_generator"),
    ]

    for app_label, model_name, expected_module in checks:
        generator = PDF_GENERATORS_REGISTRY.get(app_label, model_name)
        assert generator is not None, f"Gerador ausente para {app_label}.{model_name}"
        assert generator.__module__ == expected_module
