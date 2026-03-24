from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.patient import Patient
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.tenants.models.tenant import Tenant
from apps.equipment_integrations.models import (
    IntegrationCredential,
    IntegrationEquipment,
    IntegrationAnalyteMapping,
    IntegrationOrder,
    IntegrationRouting,
)
from core.constants.laboratory.metodo import Metodo
from core.constants.laboratory.setor import Setor
from core.constants.laboratory.tipo_resultado import TipoResultado
from core.constants.laboratory.unidades import UnidadePadrao


def _tenant():
    return Tenant.objects.create(identificador="tn-int", nome="Tenant Int")


def _paciente(tenant):
    return Patient.objects.create(
        inquilino=tenant,
        nome="Paciente Int",
        genero="Masculino",
        endereco_rua="Rua Z",
    )


def _exame(tenant):
    return LabExam.objects.create(
        inquilino=tenant,
        nome="Hemograma",
        preco=Decimal("30.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.HEMATOLOGIA,
    )


@pytest.mark.django_db
def test_requisicao_item_cria_ordem_integracao_por_setor():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)

    equipamento = IntegrationEquipment.objects.create(
        inquilino=tenant,
        nome="Analyzer Hematologia",
        modalidade=IntegrationEquipment.Modalidade.HEMOGRAMA,
        protocolo=IntegrationEquipment.Protocolo.HTTP_JSON,
    )
    equipamento.refresh_from_db()
    assert equipamento.id_custom
    IntegrationRouting.objects.create(
        inquilino=tenant,
        equipamento=equipamento,
        tipo_exame=IntegrationRouting.TipoExame.LABORATORIO,
        setor=Setor.HEMATOLOGIA,
        ativo=True,
    )

    req = LabRequest.objects.create(inquilino=tenant, paciente=paciente)
    item = LabRequestItem.objects.create(inquilino=tenant, requisicao=req, exame=exame)

    ordem = IntegrationOrder.objects.get(equipamento=equipamento, requisicao=req, deletado=False)
    assert ordem.estado == IntegrationOrder.Estado.PENDENTE
    assert ordem.itens.filter(requisicao_item=item, deletado=False).exists()


@pytest.mark.django_db
def test_inbox_http_aplica_resultado_por_mapeamento():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)

    campo = LabExamField.objects.create(
        inquilino=tenant,
        exame=exame,
        nome="Hemoglobina",
        tipo=TipoResultado.NUMERICO,
        unidade=UnidadePadrao.G_DL,
    )

    equipamento = IntegrationEquipment.objects.create(
        inquilino=tenant,
        nome="Analyzer Hematologia",
        modalidade=IntegrationEquipment.Modalidade.HEMOGRAMA,
        protocolo=IntegrationEquipment.Protocolo.HTTP_JSON,
    )
    IntegrationRouting.objects.create(
        inquilino=tenant,
        equipamento=equipamento,
        tipo_exame=IntegrationRouting.TipoExame.LABORATORIO,
        setor=Setor.HEMATOLOGIA,
        ativo=True,
    )

    IntegrationAnalyteMapping.objects.create(
        inquilino=tenant,
        equipamento=equipamento,
        codigo="HB",
        exame_campo=campo,
        ativo=True,
    )

    cred, key = IntegrationCredential.gerar(equipamento=equipamento, label="key")
    assert IntegrationCredential.validar_chave(key).id == cred.id

    req = LabRequest.objects.create(inquilino=tenant, paciente=paciente)
    LabRequestItem.objects.create(inquilino=tenant, requisicao=req, exame=exame)

    ordem = IntegrationOrder.objects.get(equipamento=equipamento, requisicao=req, deletado=False)

    client = APIClient()

    # Worklist
    worklist = client.get(
        f"/api/v1/equipment_integrations/equipment/{equipamento.id_custom}/worklist/",
        HTTP_X_INTEGRATION_KEY=key,
    )
    assert worklist.status_code == 200
    assert worklist.data["count"] >= 1

    # Inbox
    resp = client.post(
        f"/api/v1/equipment_integrations/equipment/{equipamento.id_custom}/results/",
        data={
            "message_id": "msg-1",
            "accession": ordem.id_custom,
            "results": [{"codigo": "HB", "valor": "13.2"}],
        },
        format="json",
        HTTP_X_INTEGRATION_KEY=key,
    )
    assert resp.status_code == 200
    assert resp.data["ordem_estado"] in {IntegrationOrder.Estado.EM_EXECUCAO, IntegrationOrder.Estado.CONCLUIDA}

    resultado = Result.objects.get(requisicao=req)
    item = ResultItem.objects.get(resultado=resultado, exame_campo=campo)
    assert item.resultado_valor == Decimal("13.20")
