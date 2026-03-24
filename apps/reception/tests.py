from decimal import Decimal

import pytest

from application.reception.care_flow import (
    create_invoice_for_checkin,
    create_request_for_checkin,
    open_checkin,
    register_payment_for_checkin,
)
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant
from apps.reception.models.checkin_recepcao import CheckinRecepcao
from core.constants.laboratory.metodo import Metodo
from core.constants.laboratory.setor import Setor


def _tenant():
    return Tenant.objects.create(identificador="tn-rec", nome="Tenant Recepcao")


def _paciente(tenant):
    return Patient.objects.create(
        inquilino=tenant,
        nome="Paciente Rec",
        genero="Masculino",
        endereco_rua="Rua R",
    )


def _exame(tenant):
    return LabExam.objects.create(
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

    checkin = open_checkin(inquilino=tenant, paciente=paciente, prioridade=CheckinRecepcao.Prioridade.NORMAL)

    requisicao = create_request_for_checkin(checkin=checkin, exame_ids=[exame.id])

    fatura = create_invoice_for_checkin(checkin=checkin, emitir=True)

    pagamento, recibo = register_payment_for_checkin(checkin=checkin, valor=Decimal("50.00"))

    checkin.refresh_from_db()
    fatura.refresh_from_db()

    assert checkin.requisicao_id == requisicao.id
    assert checkin.fatura_id == fatura.id
    assert pagamento.status in {pagamento.Status.CONFIRMADO, pagamento.Status.PENDENTE}
    assert recibo is None or recibo.valor == pagamento.valor
