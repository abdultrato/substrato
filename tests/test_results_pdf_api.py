"""Tests for laboratory result API contracts."""

from datetime import date
from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.clinical.models.sample import Sample
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.clinical_status import ClinicalStatus
from core.constants.laboratory.method import Method
from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.sector import Sector
from core.constants.laboratory.units import DefaultUnit
from domain.clinical.result_state import ResultState
from security.permissions.rbac import GROUPS


def _response_data(response):
    """Extract payload from DRF Response or plain HttpResponse."""
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _tenant():
    """Create an isolated tenant for laboratory result API scenarios."""
    return Tenant.objects.create(
        identifier="tn-pdf-api",
        name="Tenant PDF API",
        domain="pdf-api.local",
        active=True,
    )


def _patient(tenant: Tenant):
    """Create a default patient for the tests."""
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente PDF API",
        gender="Masculino",
        address_street="Rua PDF API",
        birth_date=date(1991, 1, 1),
    )


def _exam(tenant: Tenant):
    """Create the base laboratory exam for result scenarios."""
    sample = Sample.objects.create(
        tenant=tenant,
        name="Sangue total",
        bottle_type=Sample.BottleType.EDTA_TUBE,
    )
    return LabExam.objects.create(
        tenant=tenant,
        name="Hemograma API",
        price=Decimal("14.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        turnaround_hours=2,
        sample_type=sample,
    )


def _field(exam: LabExam):
    """Create a result field for the exam."""
    return LabExamField.objects.create(
        tenant=exam.tenant,
        exam=exam,
        name="Hemoglobina",
        type=ResultType.NUMERICO,
        unit=DefaultUnit.G_DL,
    )


def _fields(exam: LabExam, total: int):
    """Create multiple result fields for a multi-parameter exam."""
    return [
        LabExamField.objects.create(
            tenant=exam.tenant,
            exam=exam,
            name=f"Parâmetro {index}",
            type=ResultType.NUMERICO,
            unit=DefaultUnit.G_DL,
        )
        for index in range(1, total + 1)
    ]


def _authenticate_lab_user(tenant: Tenant, api_client):
    """Authenticate a laboratory user in the API client."""
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="lab_pdf_api",
        email="lab-pdf-api@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name=GROUPS["LABORATORIO"])
    user.groups.add(group)

    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


def _request_with_result_item(tenant: Tenant, patient: Patient, exam: LabExam, field: LabExamField):
    """Create a request with a ResultItem ready for state changes."""
    request = LabRequest.objects.create(tenant=tenant, patient=patient)
    request_item = LabRequestItem.objects.create(tenant=tenant, request=request, exam=exam)
    result = Result.objects.create(request=request, tenant=tenant)
    request_item._create_results()
    item = ResultItem.objects.get(result=result, exam_field=field)
    return request, item


@pytest.mark.django_db
def test_results_pdf_returns_pdf_when_has_validated_result(api_client):
    """The English endpoint returns a PDF when there is a validated item."""
    tenant = _tenant()
    _authenticate_lab_user(tenant, api_client)
    patient = _patient(tenant)
    exam = _exam(tenant)
    field = _field(exam)

    request, item = _request_with_result_item(tenant, patient, exam, field)
    item.result_value = Decimal("12.4")
    item.status = ResultState.VALIDATED
    item.save(update_fields=["result_value", "status"])

    old_response = api_client.get(f"/api/v1/clinical/labrequest/{request.id}/pdf_resultados/")
    response = api_client.get(f"/api/v1/clinical/labrequest/{request.id}/results-pdf/")

    assert old_response.status_code == 404
    assert response.status_code == 200
    assert "application/pdf" in response["Content-Type"]
    assert len(response.content) > 0


@pytest.mark.django_db
def test_results_pdf_requires_at_least_one_validated_result(api_client):
    """The endpoint blocks PDF generation until a result is validated."""
    tenant = _tenant()
    _authenticate_lab_user(tenant, api_client)
    patient = _patient(tenant)
    exam = _exam(tenant)
    field = _field(exam)

    request, _ = _request_with_result_item(tenant, patient, exam, field)

    response = api_client.get(f"/api/v1/clinical/labrequest/{request.id}/results-pdf/")

    assert response.status_code == 409
    payload = _response_data(response)
    assert payload["code"] == "lab_results_pdf_not_ready"
    assert payload["status"] == "not_ready"
    assert payload["expected"] is True
    assert payload["summary"]["validated"] == 0
    assert payload["request"]["id"] == request.id
    assert "valide pelo menos um resultado" in payload["message"].lower()


@pytest.mark.django_db
def test_result_items_contract_uses_english_payload_and_routes(api_client):
    """Result item summaries must not expose Portuguese compatibility keys."""
    tenant = _tenant()
    _authenticate_lab_user(tenant, api_client)
    patient = _patient(tenant)
    exam = _exam(tenant)
    field = _field(exam)
    request, _ = _request_with_result_item(tenant, patient, exam, field)

    response = api_client.get(f"/api/v1/clinical/labrequest/{request.id}/result-items/")
    old_result_itens_response = api_client.get(f"/api/v1/clinical/labrequest/{request.id}/result_itens/")
    old_resultado_itens_response = api_client.get(f"/api/v1/clinical/labrequest/{request.id}/resultado_itens/")

    assert response.status_code == 200
    assert old_result_itens_response.status_code == 404
    assert old_resultado_itens_response.status_code == 404

    payload = _response_data(response)
    assert set(payload) == {"request", "summary", "items"}
    assert set(payload["summary"]) == {
        "total",
        "pending",
        "in_analysis",
        "awaiting_validation",
        "validated",
        "rejected",
        "disregarded",
        "disregard_awaiting_validation",
    }
    assert "requisicao" not in payload
    assert "resumo" not in payload
    assert "itens" not in payload
    assert payload["request"]["custom_id"] == request.custom_id
    assert payload["request"]["patient_name"] == patient.name
    assert "id_custom" not in payload["request"]
    assert "paciente_nome" not in payload["request"]

    item_payload = payload["items"][0]
    assert "custom_id" in item_payload
    assert "result_value" in item_payload
    assert "critical_alert" in item_payload
    assert "validation_date" in item_payload
    assert "id_custom" not in item_payload
    assert "resultado_valor" not in item_payload
    assert "alerta_critico" not in item_payload
    assert "data_validacao" not in item_payload


@pytest.mark.django_db
def test_lab_requests_are_ordered_by_clinical_attendance_priority(api_client):
    """The request queue prioritizes emergency, then urgent levels, then normal care."""
    tenant = _tenant()
    _authenticate_lab_user(tenant, api_client)
    patient = _patient(tenant)
    shuffled_priorities = [
        ClinicalStatus.NORMAL,
        ClinicalStatus.URGENT,
        ClinicalStatus.EMERGENCY,
        ClinicalStatus.LOW_URGENCY,
        ClinicalStatus.EXTREMELY_URGENT,
        ClinicalStatus.PRIORITY,
        ClinicalStatus.VERY_URGENT,
    ]

    for priority in shuffled_priorities:
        LabRequest.objects.create(tenant=tenant, patient=patient, clinical_status=priority)

    response = api_client.get("/api/v1/clinical/labrequest/?type=LAB&status=pendente&page_size=20")

    assert response.status_code == 200
    payload = _response_data(response)
    rows = payload["results"] if isinstance(payload, dict) else payload
    assert [row["clinical_status"] for row in rows] == [
        ClinicalStatus.EMERGENCY,
        ClinicalStatus.EXTREMELY_URGENT,
        ClinicalStatus.VERY_URGENT,
        ClinicalStatus.URGENT,
        ClinicalStatus.LOW_URGENCY,
        ClinicalStatus.PRIORITY,
        ClinicalStatus.NORMAL,
    ]


@pytest.mark.django_db
def test_result_item_actions_use_english_routes_and_payload(api_client):
    """Result item state-machine actions are exposed through English routes only."""
    tenant = _tenant()
    _authenticate_lab_user(tenant, api_client)
    patient = _patient(tenant)
    exam = _exam(tenant)
    field = _field(exam)
    _, item = _request_with_result_item(tenant, patient, exam, field)

    start_response = api_client.post(f"/api/v1/clinical/resultitem/{item.id}/start-analysis/")
    old_start_response = api_client.post(f"/api/v1/clinical/resultitem/{item.id}/lancar/")
    invalid_save_response = api_client.post(
        f"/api/v1/clinical/resultitem/{item.id}/save-result/",
        data={"resultado_valor": "12.8"},
        format="json",
    )
    save_response = api_client.post(
        f"/api/v1/clinical/resultitem/{item.id}/save-result/",
        data={"result_value": "12.8"},
        format="json",
    )
    old_save_response = api_client.post(f"/api/v1/clinical/resultitem/{item.id}/gravar/")
    validate_response = api_client.post(f"/api/v1/clinical/resultitem/{item.id}/validate-result/")
    old_validate_response = api_client.post(f"/api/v1/clinical/resultitem/{item.id}/validar/")

    assert start_response.status_code == 200
    assert _response_data(start_response)["status"] == ResultState.IN_ANALYSIS
    assert old_start_response.status_code == 404

    assert invalid_save_response.status_code == 400
    assert "result_value" in str(_response_data(invalid_save_response))

    assert save_response.status_code == 200
    save_payload = _response_data(save_response)
    assert save_payload["status"] == ResultState.AWAITING_VALIDATION
    assert Decimal(str(save_payload["result_value"])) == Decimal("12.80")
    assert "resultado_valor" not in save_payload
    assert old_save_response.status_code == 404

    assert validate_response.status_code == 200
    validate_payload = _response_data(validate_response)
    assert validate_payload["status"] == ResultState.VALIDATED
    assert "estado" not in validate_payload
    assert old_validate_response.status_code == 404


@pytest.mark.django_db
def test_partial_entered_results_keep_request_in_analysis_until_empty_fields_are_disregarded(api_client):
    """A request stays in analysis until all fields are filled or disregarded."""
    tenant = _tenant()
    user = _authenticate_lab_user(tenant, api_client)
    patient = _patient(tenant)
    exam = _exam(tenant)
    fields = _fields(exam, 3)
    request, _ = _request_with_result_item(tenant, patient, exam, fields[0])
    items = list(ResultItem.objects.filter(result=request.result).order_by("position", "id"))

    for index, item in enumerate(items[:2], start=1):
        response = api_client.post(
            f"/api/v1/clinical/resultitem/{item.id}/save-result/",
            data={"result_value": str(10 + index)},
            format="json",
        )
        assert response.status_code == 200

    request.refresh_from_db()
    assert request.status == ResultState.IN_ANALYSIS

    validate_response = api_client.post(f"/api/v1/clinical/labrequest/{request.id}/validate-results/")
    assert validate_response.status_code == 400
    request.refresh_from_db()
    assert request.status == ResultState.IN_ANALYSIS

    items = list(ResultItem.objects.filter(result=request.result).order_by("position", "id"))
    assert [item.status for item in items] == [
        ResultState.AWAITING_VALIDATION,
        ResultState.AWAITING_VALIDATION,
        ResultState.PENDING,
    ]
    assert items[2].result_value is None
    assert items[0].validated_by_id is None

    disregard_response = api_client.post(
        f"/api/v1/clinical/labrequest/{request.id}/disregard-empty-results/",
        data={"reason": "Amostra insuficiente para o terceiro parâmetro."},
        format="json",
    )
    assert disregard_response.status_code == 200
    payload = _response_data(disregard_response)
    assert payload["workflow"]["disregarded"] == 1

    empty_item = ResultItem.objects.get(result=request.result, exam_field=fields[2])
    assert empty_item.status == ResultState.DISREGARDED
    assert empty_item.disregard_reason == "Amostra insuficiente para o terceiro parâmetro."
    assert empty_item.disregard_validation_date is None
    request.refresh_from_db()
    assert request.status == ResultState.AWAITING_VALIDATION

    final_response = api_client.post(f"/api/v1/clinical/labrequest/{request.id}/validate-results/")
    assert final_response.status_code == 200
    final_payload = _response_data(final_response)
    assert final_payload["workflow"]["validated_disregards"] == 1

    empty_item.refresh_from_db()
    validated_items = list(ResultItem.objects.filter(result=request.result).order_by("position", "id"))
    request.refresh_from_db()
    assert empty_item.disregard_validated_by_id == user.id
    assert empty_item.disregard_validation_date is not None
    assert [item.validated_by_id for item in validated_items[:2]] == [user.id, user.id]
    assert request.status == ResultState.VALIDATED


@pytest.mark.django_db
def test_disregard_empty_results_requires_reason_and_does_not_touch_filled_values(api_client):
    """Disregarding is explicit, reasoned, and only affects empty result fields."""
    tenant = _tenant()
    _authenticate_lab_user(tenant, api_client)
    patient = _patient(tenant)
    exam = _exam(tenant)
    fields = _fields(exam, 2)
    request, _ = _request_with_result_item(tenant, patient, exam, fields[0])
    filled, empty = list(ResultItem.objects.filter(result=request.result).order_by("position", "id"))

    save_response = api_client.post(
        f"/api/v1/clinical/resultitem/{filled.id}/save-result/",
        data={"result_value": "13.2"},
        format="json",
    )
    assert save_response.status_code == 200

    invalid_response = api_client.post(
        f"/api/v1/clinical/labrequest/{request.id}/disregard-empty-results/",
        data={"reason": ""},
        format="json",
    )
    assert invalid_response.status_code == 400

    valid_response = api_client.post(
        f"/api/v1/clinical/labrequest/{request.id}/disregard-empty-results/",
        data={"reason": "Parâmetro sem material suficiente."},
        format="json",
    )
    assert valid_response.status_code == 200

    filled.refresh_from_db()
    empty.refresh_from_db()
    assert filled.status == ResultState.AWAITING_VALIDATION
    assert filled.result_value == Decimal("13.20")
    assert empty.status == ResultState.DISREGARDED
    assert empty.disregard_reason == "Parâmetro sem material suficiente."


@pytest.mark.django_db
def test_individual_result_line_can_be_disregarded_without_touching_other_fields(api_client):
    """A single empty parameter can be disregarded inline without closing the whole exam."""
    tenant = _tenant()
    _authenticate_lab_user(tenant, api_client)
    patient = _patient(tenant)
    exam = _exam(tenant)
    fields = _fields(exam, 3)
    request, _ = _request_with_result_item(tenant, patient, exam, fields[0])
    first, second, third = list(ResultItem.objects.filter(result=request.result).order_by("position", "id"))

    save_response = api_client.post(
        f"/api/v1/clinical/resultitem/{first.id}/save-result/",
        data={"result_value": "11.5"},
        format="json",
    )
    assert save_response.status_code == 200

    disregard_response = api_client.post(
        f"/api/v1/clinical/resultitem/{third.id}/disregard-result/",
        data={},
        format="json",
    )
    assert disregard_response.status_code == 200
    payload = _response_data(disregard_response)
    assert payload["id"] == third.id
    assert payload["status"] == ResultState.DISREGARDED
    assert payload["disregard_reason"] == ""

    first.refresh_from_db()
    second.refresh_from_db()
    third.refresh_from_db()
    request.refresh_from_db()

    assert first.status == ResultState.AWAITING_VALIDATION
    assert second.status == ResultState.PENDING
    assert second.disregard_reason == ""
    assert third.status == ResultState.DISREGARDED
    assert request.status == ResultState.IN_ANALYSIS


@pytest.mark.django_db
def test_validated_request_can_contain_only_validated_disregarded_results(api_client):
    """A request can be finalized when every empty result was disregarded and validated."""
    tenant = _tenant()
    user = _authenticate_lab_user(tenant, api_client)
    patient = _patient(tenant)
    exam = _exam(tenant)
    fields = _fields(exam, 2)
    request, _ = _request_with_result_item(tenant, patient, exam, fields[0])

    disregard_response = api_client.post(
        f"/api/v1/clinical/labrequest/{request.id}/disregard-empty-results/",
        data={"reason": "Sem amostra suficiente para executar os parâmetros."},
        format="json",
    )
    assert disregard_response.status_code == 200
    request.refresh_from_db()
    assert request.status == ResultState.AWAITING_VALIDATION

    validate_response = api_client.post(f"/api/v1/clinical/labrequest/{request.id}/validate-results/")
    assert validate_response.status_code == 200

    request.refresh_from_db()
    items = list(ResultItem.objects.filter(result=request.result).order_by("position", "id"))
    assert request.status == ResultState.VALIDATED
    assert [item.status for item in items] == [ResultState.DISREGARDED, ResultState.DISREGARDED]
    assert [item.disregard_validated_by_id for item in items] == [user.id, user.id]
