from decimal import Decimal

import pytest

from aplicacao.recepcao.fluxo_atendimento import (
    abrir_checkin,
    criar_fatura_para_checkin,
    criar_requisicao_para_checkin,
    registrar_pagamento_para_checkin,
)
from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.recepcao.modelos.checkin_recepcao import CheckinRecepcao
from nucleo.constantes.laboratorio.metodo import Metodo
from nucleo.constantes.laboratorio.setor import Setor


def _tenant():
    return Inquilino.objects.create(identificador="tn-rec", nome="Tenant Recepcao")


def _paciente(tenant):
    return Paciente.objects.create(
        inquilino=tenant,
        nome="Paciente Rec",
        genero="Masculino",
        endereco_rua="Rua R",
    )


def _exame(tenant):
    return Exame.objects.create(
        inquilino=tenant,
        nome="Raio-X",
        preco=Decimal("50.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.RADIOLOGIA if hasattr(Setor, "RADIOLOGIA") else Setor.HEMATOLOGIA,
    )


@pytest.mark.django_db
def test_checkin_fluxo_basico():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)

    checkin = abrir_checkin(inquilino=tenant, paciente=paciente, prioridade=CheckinRecepcao.Prioridade.NORMAL)

    requisicao = criar_requisicao_para_checkin(checkin=checkin, exame_ids=[exame.id])

    fatura = criar_fatura_para_checkin(checkin=checkin, emitir=True)

    pagamento, recibo = registrar_pagamento_para_checkin(checkin=checkin, valor=Decimal("50.00"))

    checkin.refresh_from_db()
    fatura.refresh_from_db()

    assert checkin.requisicao_id == requisicao.id
    assert checkin.fatura_id == fatura.id
    assert pagamento.status in {pagamento.Status.CONFIRMADO, pagamento.Status.PENDENTE}
    assert recibo is None or recibo.valor == pagamento.valor
