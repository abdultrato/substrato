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
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.sector import Sector
from core.constants.laboratory.units import DefaultUnit
from domain.clinical.result_state import ResultState
from security.permissions.rbac import GROUPS


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _tenant():
    return Tenant.objects.create(
        identifier="tn-pdf-api",
        name="Tenant PDF API",
        domain="pdf-api.local",
        active=True,
    )


def _patient(tenant: Tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente PDF API",
        gender="Masculino",
        address_street="Rua PDF API",
        birth_date=date(1991, 1, 1),
    )


def _exam(tenant: Tenant):
    return LabExam.objects.create(
        tenant=tenant,
        name="Hemograma API",
        price=Decimal("14.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        turnaround_hours=2,
    )


def _field(exam: LabExam):
    return LabExamField.objects.create(
        tenant=exam.tenant,
        exam=exam,
        name="Hemoglobina",
        type=ResultType.NUMERICO,
        unit=DefaultUnit.G_DL,
    )


def _authenticate_lab_user(tenant: Tenant, api_client):
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
    request = LabRequest.objects.create(tenant=tenant, patient=patient)
    request_item = LabRequestItem.objects.create(tenant=tenant, request=request, exam=exam)
    result = Result.objects.create(request=request, tenant=tenant)
    request_item._create_results()
    item = ResultItem.objects.get(result=result, exam_field=field)
    return request, item


@pytest.mark.django_db
def test_pdf_resultados_returns_pdf_when_has_validated_result(api_client):
    tenant = _tenant()
    _authenticate_lab_user(tenant, api_client)
    patient = _patient(tenant)
    exam = _exam(tenant)
    field = _field(exam)

    request, item = _request_with_result_item(tenant, patient, exam, field)
    item.result_value = Decimal("12.4")
    item.status = ResultState.VALIDATED
    item.save(update_fields=["result_value", "status"])

    response = api_client.get(f"/api/v1/clinical/labrequest/{request.id}/pdf_resultados/")

    assert response.status_code == 200
    assert "application/pdf" in response["Content-Type"]
    assert len(response.content) > 0


@pytest.mark.django_db
def test_pdf_resultados_requires_at_least_one_validated_result(api_client):
    tenant = _tenant()
    _authenticate_lab_user(tenant, api_client)
    patient = _patient(tenant)
    exam = _exam(tenant)
    field = _field(exam)

    request, _ = _request_with_result_item(tenant, patient, exam, field)

    response = api_client.get(f"/api/v1/clinical/labrequest/{request.id}/pdf_resultados/")

    assert response.status_code == 400
    payload = _response_data(response)
    assert "Não é possível emitir PDF sem nenhum result validado." in str(payload)
