from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
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


def _tenant():
    return Tenant.objects.create(identifier="tn-cli", name="Tenant Clinico")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Clinico",
        gender="Masculino",
        address_street="Rua C",
        birth_date=date(1990, 1, 1),
    )


def _exam(tenant):
    return LabExam.objects.create(
        tenant=tenant,
        name="Hemograma",
        price=Decimal("15.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        turnaround_hours=4,
    )


def _campo(exam):
    return LabExamField.objects.create(
        tenant=exam.tenant,
        exam=exam,
        name="Hemoglobina",
        type=ResultType.NUMERICO,
        unit=DefaultUnit.G_DL,
    )


@pytest.mark.django_db
def test_patient_age_calculation():
    tenant = _tenant()
    patient = _patient(tenant)
    assert "anos" in patient.idade()


@pytest.mark.django_db
def test_request_creates_result_and_items():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    field = _campo(exam)

    req = LabRequest.objects.create(tenant=tenant, patient=patient)
    item = LabRequestItem.objects.create(tenant=tenant, request=req, exam=exam)

    # Result items are created by the request item helper.
    result = Result.objects.create(request=req, tenant=tenant)
    item._criar_resultados()

    assert req.tenant == tenant
    assert result.request == req
    assert ResultItem.objects.filter(result=result, exam_field=field).exists()


@pytest.mark.django_db
def test_exam_rejects_zero_price():
    tenant = _tenant()
    exam = LabExam(
        tenant=tenant,
        name="Exame Zero",
        price=Decimal("0.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        turnaround_hours=1,
    )
    with pytest.raises(DjangoValidationError):
        exam.full_clean()

