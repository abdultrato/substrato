from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
import pytest

from application.clinical.commands import (
    SaveResultValueCommand,
    StartResultAnalysisCommand,
    ValidateResultCommand,
)
from application.clinical.handlers import (
    handle_save_result_value,
    handle_start_result_analysis,
    handle_validate_result,
)
from apps.clinical.models.clinical_history import ClinicalHistory
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.clinical.models.sample import Sample
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.sector import Sector
from core.constants.laboratory.units import DefaultUnit
from domain.clinical.result_state import ResultState


def _tenant():
    return Tenant.objects.create(identifier="tn-clinical-cmd", name="Tenant Clinical Command")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Clinical Command",
        gender="Masculino",
        address_street="Rua Clinical Command",
        birth_date=date(1991, 1, 1),
    )


def _exam(tenant):
    sample = Sample.objects.create(
        tenant=tenant,
        name="Sangue total",
        bottle_type=Sample.BottleType.EDTA_TUBE,
    )
    return LabExam.objects.create(
        tenant=tenant,
        name="Hemograma Command",
        price=Decimal("20.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        sample_type=sample,
    )


def _field(exam):
    return LabExamField.objects.create(
        tenant=exam.tenant,
        exam=exam,
        name="Hemoglobina",
        type=ResultType.NUMERICO,
        unit=DefaultUnit.G_DL,
    )


def _result_item(tenant):
    patient = _patient(tenant)
    exam = _exam(tenant)
    field = _field(exam)

    request = LabRequest.objects.create(tenant=tenant, patient=patient)
    request_item = LabRequestItem.objects.create(tenant=tenant, request=request, exam=exam)
    result = Result.objects.create(request=request, tenant=tenant)
    request_item._create_results()
    return ResultItem.objects.get(result=result, exam_field=field)


@pytest.mark.django_db
def test_start_result_analysis_command_is_idempotent():
    tenant = _tenant()
    item = _result_item(tenant)

    first = handle_start_result_analysis(
        StartResultAnalysisCommand(
            result_item=item,
            idempotent=True,
        )
    )
    second = handle_start_result_analysis(
        StartResultAnalysisCommand(
            result_item=first,
            idempotent=True,
        )
    )

    assert second.id == first.id
    assert second.status == ResultState.IN_ANALYSIS


@pytest.mark.django_db
def test_save_result_value_command_is_idempotent_for_same_value():
    tenant = _tenant()
    item = _result_item(tenant)
    handle_start_result_analysis(StartResultAnalysisCommand(result_item=item))

    first = handle_save_result_value(
        SaveResultValueCommand(
            result_item=item,
            raw_value="12,3",
            idempotent=True,
        )
    )
    second = handle_save_result_value(
        SaveResultValueCommand(
            result_item=first,
            raw_value="12.3",
            idempotent=True,
        )
    )

    assert second.id == first.id
    assert second.status == ResultState.AWAITING_VALIDATION
    assert second.result_value == Decimal("12.3")


@pytest.mark.django_db
def test_save_result_value_command_rejects_missing_value():
    tenant = _tenant()
    item = _result_item(tenant)
    handle_start_result_analysis(StartResultAnalysisCommand(result_item=item))

    with pytest.raises(DjangoValidationError):
        handle_save_result_value(
            SaveResultValueCommand(
                result_item=item,
                raw_value=None,
            )
        )


@pytest.mark.django_db
def test_validate_result_command_registers_history_once_when_idempotent(monkeypatch):
    monkeypatch.setattr("events.bus.transaction.on_commit", lambda callback: callback())

    tenant = _tenant()
    item = _result_item(tenant)
    handle_start_result_analysis(StartResultAnalysisCommand(result_item=item))
    handle_save_result_value(
        SaveResultValueCommand(
            result_item=item,
            raw_value="9.7",
            idempotent=True,
        )
    )

    before_count = ClinicalHistory.objects.count()
    first = handle_validate_result(
        ValidateResultCommand(
            result_item=item,
            idempotent=True,
        )
    )
    second = handle_validate_result(
        ValidateResultCommand(
            result_item=first,
            idempotent=True,
        )
    )

    latest = ClinicalHistory.objects.order_by("-id").first()

    assert first.status == ResultState.VALIDATED
    assert second.id == first.id
    assert ClinicalHistory.objects.count() == before_count + 1
    assert latest is not None
    assert latest.patient_id == first.result.request.patient_id
    assert "Resultado validado:" in latest.description
