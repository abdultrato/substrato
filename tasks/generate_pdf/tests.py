from django.http import HttpRequest
from decimal import Decimal
from datetime import date

import pytest

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.sector import Sector
from core.constants.laboratory.units import DefaultUnit
from domain.clinical.result_state import ResultState
from tasks.generate_pdf.result_pdf_generator import generate_results_pdf
from tasks.generate_pdf.views import request_pdf


def test_request_pdf_404(db):
    request = HttpRequest()
    try:
        request_pdf(request, request_id=99999)
    except Exception as exc:
        # Expect Http404
        assert exc.__class__.__name__ == "Http404"
    else:
        raise AssertionError("Expected Http404 for missing request")


@pytest.mark.django_db
def test_generate_results_pdf_with_validated_item():
    tenant = Tenant.objects.create(identifier="tn-pdf", name="Tenant PDF")
    patient = Patient.objects.create(
        tenant=tenant,
        name="Paciente PDF",
        gender="Masculino",
        address_street="Rua PDF",
        birth_date=date(1992, 1, 1),
    )

    exam = LabExam.objects.create(
        tenant=tenant,
        name="Hemograma",
        price=Decimal("10.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        turnaround_hours=2,
    )
    field = LabExamField.objects.create(
        tenant=tenant,
        exam=exam,
        name="Hemoglobina",
        type=ResultType.NUMERICO,
        unit=DefaultUnit.G_DL,
    )

    request = LabRequest.objects.create(tenant=tenant, patient=patient)
    request_item = LabRequestItem.objects.create(tenant=tenant, request=request, exam=exam)

    result = Result.objects.create(request=request, tenant=tenant)
    request_item._create_results()
    item = ResultItem.objects.get(result=result, exam_field=field)
    item.result_value = Decimal("13.2")
    item.status = ResultState.VALIDATED
    item.save(update_fields=["result_value", "status"])

    pdf_bytes, filename = generate_results_pdf(request, apenas_validados=True)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert filename.endswith(".pdf")
