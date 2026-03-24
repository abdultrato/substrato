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
from apps.reception.models.reception_checkin import ReceptionCheckin
from core.constants.laboratory.method import Metodo
from core.constants.laboratory.sector import Setor


@pytest.mark.django_db
def test_reception_flow_billing_payment():
    tenant = Tenant.objects.create(identificador="tn-flow", nome="Tenant Flow")

    patient = Patient.objects.create(
        inquilino=tenant,
        nome="Paciente Flow",
        genero="Masculino",
        endereco_rua="Rua A",
        endereco_cidade="Maputo",
    )

    exam = LabExam.objects.create(
        inquilino=tenant,
        nome="Hemograma",
        preco=Decimal("25.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.HEMATOLOGIA,
    )

    checkin = open_checkin(
        inquilino=tenant,
        paciente=patient,
        prioridade=ReceptionCheckin.Priority.NORMAL,
    )

    request = create_request_for_checkin(
        checkin=checkin,
        exame_ids=[exam.id],
    )

    fatura = create_invoice_for_checkin(checkin=checkin, emitir=True)

    payment, receipt = register_payment_for_checkin(
        checkin=checkin,
        valor=fatura.total,
    )

    checkin.refresh_from_db()
    fatura.refresh_from_db()

    assert request.pk
    assert fatura.pk
    assert payment.pk
    assert receipt is not None
    assert fatura.estado in {fatura.Estado.EMITIDA, fatura.Estado.PAGA}
    assert fatura.pagamentos.exists()
    assert fatura.recibos.exists()
    assert checkin.fatura_id == fatura.id
    assert checkin.requisicao_id == request.id


test_fluxo_recepcao_faturamento_pagamento = test_reception_flow_billing_payment
