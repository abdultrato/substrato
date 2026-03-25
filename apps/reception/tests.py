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
from apps.reception.models.reception_checkin import ReceptionCheckin
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Metodo
from core.constants.laboratory.sector import Setor


def _tenant():
    return Tenant.objects.create(identificador="tn-rec", nome="Tenant Recepcao")


def _patient(tenant):
    return Patient.objects.create(
        inquilino=tenant,
        nome="Paciente Rec",
        genero="Masculino",
        endereco_rua="Rua R",
    )


def _exam(tenant):
    return LabExam.objects.create(
        inquilino=tenant,
        nome="Raio-X",
        preco=Decimal("50.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.RADIOLOGIA if hasattr(Setor, "RADIOLOGIA") else Setor.HEMATOLOGIA,
    )


@pytest.mark.django_db
def test_checkin_basic_flow():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)

    checkin = open_checkin(inquilino=tenant, paciente=patient, prioridade=ReceptionCheckin.Priority.NORMAL)

    request = create_request_for_checkin(checkin=checkin, exame_ids=[exam.id])

    fatura = create_invoice_for_checkin(checkin=checkin, emitir=True)

    payment, receipt = register_payment_for_checkin(checkin=checkin, valor=Decimal("50.00"))

    checkin.refresh_from_db()
    fatura.refresh_from_db()

    assert checkin.requisicao_id == request.id
    assert checkin.fatura_id == fatura.id
    assert payment.status in {payment.Status.CONFIRMADO, payment.Status.PENDENTE}
    assert receipt is None or receipt.valor == payment.valor


_paciente = _patient
_exame = _exam
test_checkin_fluxo_basico = test_checkin_basic_flow
