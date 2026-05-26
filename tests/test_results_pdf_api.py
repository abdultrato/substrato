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
