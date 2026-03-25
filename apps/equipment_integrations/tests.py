from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.equipment_integrations.models import (
    IntegrationAnalyteMapping,
    IntegrationCredential,
    IntegrationEquipment,
    IntegrationOrder,
    IntegrationRouting,
)
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Metodo
from core.constants.laboratory.result_type import TipoResultado
from core.constants.laboratory.sector import Setor
from core.constants.laboratory.units import UnidadePadrao


def _tenant():
    return Tenant.objects.create(identifier="tn-int", name="Tenant Int")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Int",
        gender="Masculino",
        address_street="Rua Z",
    )


def _exam(tenant):
    return LabExam.objects.create(
        tenant=tenant,
        name="Hemograma",
        price=Decimal("30.00"),
        method=Metodo.ENZIMATICO,
        sector=Setor.HEMATOLOGIA,
    )


@pytest.mark.django_db
def test_request_item_creates_integration_order_by_sector():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)

    equipment = IntegrationEquipment.objects.create(
        tenant=tenant,
        name="Analyzer Hematologia",
        modality=IntegrationEquipment.Modalidade.HEMOGRAMA,
        protocol=IntegrationEquipment.Protocolo.HTTP_JSON,
    )
    equipment.refresh_from_db()
    assert equipment.custom_id
    IntegrationRouting.objects.create(
        tenant=tenant,
        equipment=equipment,
        exam_type=IntegrationRouting.ExamType.LABORATORIO,
        sector=Setor.HEMATOLOGIA,
        active=True,
    )

    req = LabRequest.objects.create(tenant=tenant, patient=patient)
    item = LabRequestItem.objects.create(tenant=tenant, request=req, exam=exam)

    order = IntegrationOrder.objects.get(equipment=equipment, request=req, deleted=False)
    assert order.status == IntegrationOrder.Estado.PENDENTE
    assert order.itens.filter(request_item=item, deleted=False).exists()


@pytest.mark.django_db
def test_http_inbox_applies_result_by_mapping():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)

    campo = LabExamField.objects.create(
        tenant=tenant,
        exam=exam,
        name="Hemoglobina",
        type=TipoResultado.NUMERICO,
        unit=UnidadePadrao.G_DL,
    )

    equipment = IntegrationEquipment.objects.create(
        tenant=tenant,
        name="Analyzer Hematologia",
        modality=IntegrationEquipment.Modalidade.HEMOGRAMA,
        protocol=IntegrationEquipment.Protocolo.HTTP_JSON,
    )
    IntegrationRouting.objects.create(
        tenant=tenant,
        equipment=equipment,
        exam_type=IntegrationRouting.ExamType.LABORATORIO,
        sector=Setor.HEMATOLOGIA,
        active=True,
    )

    IntegrationAnalyteMapping.objects.create(
        tenant=tenant,
        equipment=equipment,
        code="HB",
        exam_field=campo,
        active=True,
    )

    cred, key = IntegrationCredential.generate(equipment=equipment, label="key")
    assert IntegrationCredential.validate_key(key).id == cred.id

    req = LabRequest.objects.create(tenant=tenant, patient=patient)
    LabRequestItem.objects.create(tenant=tenant, request=req, exam=exam)

    order = IntegrationOrder.objects.get(equipment=equipment, request=req, deleted=False)

    client = APIClient()

    # Worklist
    worklist = client.get(
        f"/api/v1/equipment_integrations/equipment/{equipment.custom_id}/worklist/",
        HTTP_X_INTEGRATION_KEY=key,
    )
    assert worklist.status_code == 200
    assert worklist.data["count"] >= 1

    # Inbox
    resp = client.post(
        f"/api/v1/equipment_integrations/equipment/{equipment.custom_id}/results/",
        data={
            "message_id": "msg-1",
            "accession": order.custom_id,
            "results": [{"code": "HB", "value": "13.2"}],
        },
        format="json",
        HTTP_X_INTEGRATION_KEY=key,
    )
    assert resp.status_code == 200
    assert resp.data["order_status"] in {IntegrationOrder.Estado.EM_EXECUCAO, IntegrationOrder.Estado.CONCLUIDA}

    result = Result.objects.get(request=req)
    item = ResultItem.objects.get(result=result, exam_field=campo)
    assert item.result_value == Decimal("13.20")


_patient = _patient
_exam = _exam
test_request_item_cria_order_integracao_por_sector = test_request_item_creates_integration_order_by_sector
test_inbox_http_aplica_result_por_mapeamento = test_http_inbox_applies_result_by_mapping
