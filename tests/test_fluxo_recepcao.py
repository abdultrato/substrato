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


@pytest.mark.django_db
def test_fluxo_recepcao_faturamento_pagamento():
    tenant = Inquilino.objects.create(identificador="tn-flow", nome="Tenant Flow")

    paciente = Paciente.objects.create(
        inquilino=tenant,
        nome="Paciente Flow",
        genero="Masculino",
        morada={"rua": "Rua A", "cidade": "Maputo"},
    )

    exame = Exame.objects.create(
        inquilino=tenant,
        nome="Hemograma",
        preco=Decimal("25.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.HEMATOLOGIA,
    )

    checkin = abrir_checkin(
        inquilino=tenant,
        paciente=paciente,
        prioridade=CheckinRecepcao.Prioridade.NORMAL,
    )

    requisicao = criar_requisicao_para_checkin(
        checkin=checkin,
        exame_ids=[exame.id],
    )

    fatura = criar_fatura_para_checkin(checkin=checkin, emitir=True)

    pagamento, recibo = registrar_pagamento_para_checkin(
        checkin=checkin,
        valor=fatura.total,
    )

    checkin.refresh_from_db()
    fatura.refresh_from_db()

    assert requisicao.pk
    assert fatura.pk
    assert pagamento.pk
    assert recibo is not None
    assert fatura.estado in {fatura.Estado.EMITIDA, fatura.Estado.PAGA}
    assert fatura.pagamentos.exists()
    assert fatura.recibos.exists()
    assert checkin.fatura_id == fatura.id
    assert checkin.requisicao_id == requisicao.id
