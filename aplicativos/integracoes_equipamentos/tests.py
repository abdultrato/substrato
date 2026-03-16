from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exame_campo import ExameCampo
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.clinico.modelos.resultado import Resultado
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.integracoes_equipamentos.modelos import (
    IntegracaoCredencial,
    IntegracaoEquipamento,
    IntegracaoMapeamentoAnalito,
    IntegracaoOrdem,
    IntegracaoRoteamento,
)
from nucleo.constantes.laboratorio.metodo import Metodo
from nucleo.constantes.laboratorio.setor import Setor
from nucleo.constantes.laboratorio.tipo_resultado import TipoResultado
from nucleo.constantes.laboratorio.unidades import UnidadePadrao


def _tenant():
    return Inquilino.objects.create(identificador="tn-int", nome="Tenant Int")


def _paciente(tenant):
    return Paciente.objects.create(
        inquilino=tenant,
        nome="Paciente Int",
        genero="Masculino",
        endereco_rua="Rua Z",
    )


def _exame(tenant):
    return Exame.objects.create(
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

    equipamento = IntegracaoEquipamento.objects.create(
        inquilino=tenant,
        nome="Analyzer Hematologia",
        modalidade=IntegracaoEquipamento.Modalidade.HEMOGRAMA,
        protocolo=IntegracaoEquipamento.Protocolo.HTTP_JSON,
    )
    equipamento.refresh_from_db()
    assert equipamento.id_custom
    IntegracaoRoteamento.objects.create(
        inquilino=tenant,
        equipamento=equipamento,
        tipo_exame=IntegracaoRoteamento.TipoExame.LABORATORIO,
        setor=Setor.HEMATOLOGIA,
        ativo=True,
    )

    req = RequisicaoAnalise.objects.create(inquilino=tenant, paciente=paciente)
    item = RequisicaoItem.objects.create(inquilino=tenant, requisicao=req, exame=exame)

    ordem = IntegracaoOrdem.objects.get(equipamento=equipamento, requisicao=req, deletado=False)
    assert ordem.estado == IntegracaoOrdem.Estado.PENDENTE
    assert ordem.itens.filter(requisicao_item=item, deletado=False).exists()


@pytest.mark.django_db
def test_inbox_http_aplica_resultado_por_mapeamento():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)

    campo = ExameCampo.objects.create(
        inquilino=tenant,
        exame=exame,
        nome="Hemoglobina",
        tipo=TipoResultado.NUMERICO,
        unidade=UnidadePadrao.G_DL,
    )

    equipamento = IntegracaoEquipamento.objects.create(
        inquilino=tenant,
        nome="Analyzer Hematologia",
        modalidade=IntegracaoEquipamento.Modalidade.HEMOGRAMA,
        protocolo=IntegracaoEquipamento.Protocolo.HTTP_JSON,
    )
    IntegracaoRoteamento.objects.create(
        inquilino=tenant,
        equipamento=equipamento,
        tipo_exame=IntegracaoRoteamento.TipoExame.LABORATORIO,
        setor=Setor.HEMATOLOGIA,
        ativo=True,
    )

    IntegracaoMapeamentoAnalito.objects.create(
        inquilino=tenant,
        equipamento=equipamento,
        codigo="HB",
        exame_campo=campo,
        ativo=True,
    )

    cred, key = IntegracaoCredencial.gerar(equipamento=equipamento, label="key")
    assert IntegracaoCredencial.validar_chave(key).id == cred.id

    req = RequisicaoAnalise.objects.create(inquilino=tenant, paciente=paciente)
    RequisicaoItem.objects.create(inquilino=tenant, requisicao=req, exame=exame)

    ordem = IntegracaoOrdem.objects.get(equipamento=equipamento, requisicao=req, deletado=False)

    client = APIClient()

    # Worklist
    worklist = client.get(
        f"/api/v1/integracoes/equipamentos/{equipamento.id_custom}/worklist/",
        HTTP_X_INTEGRATION_KEY=key,
    )
    assert worklist.status_code == 200
    assert worklist.data["count"] >= 1

    # Inbox
    resp = client.post(
        f"/api/v1/integracoes/equipamentos/{equipamento.id_custom}/resultados/",
        data={
            "message_id": "msg-1",
            "accession": ordem.id_custom,
            "results": [{"codigo": "HB", "valor": "13.2"}],
        },
        format="json",
        HTTP_X_INTEGRATION_KEY=key,
    )
    assert resp.status_code == 200
    assert resp.data["ordem_estado"] in {IntegracaoOrdem.Estado.EM_EXECUCAO, IntegracaoOrdem.Estado.CONCLUIDA}

    resultado = Resultado.objects.get(requisicao=req)
    item = ResultadoItem.objects.get(resultado=resultado, exame_campo=campo)
    assert item.resultado_valor == Decimal("13.20")
