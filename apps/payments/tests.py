from datetime import datetime
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Metodo
from core.constants.laboratory.sector import Setor


def _tenant():
    return Tenant.objects.create(identificador="tn-pay", nome="Tenant Pay")


def _patient(tenant):
    return Patient.objects.create(
        inquilino=tenant,
        nome="Paciente Pay",
        genero="Masculino",
        endereco_rua="Rua P",
    )


def _exam(tenant):
    return LabExam.objects.create(
        inquilino=tenant,
        nome="Glicose",
        preco=Decimal("20.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.BIOQUIMICA,
    )


def _horario_normal():
    return datetime(2024, 1, 2, 10, 0, tzinfo=timezone.get_current_timezone())


def _invoice_with_exam(tenant, patient, exam):
    req = LabRequest.objects.create(inquilino=tenant, paciente=patient)
    req.criado_em = _horario_normal()
    req.save(update_fields=["criado_em"])
    LabRequestItem.objects.create(inquilino=tenant, requisicao=req, exame=exam)
    fat = Invoice.objects.create(
        inquilino=tenant,
        paciente=patient,
        requisicao=req,
        origem=Invoice.Origem.CLINICO,
    )
    item = InvoiceItem.objects.create(
        inquilino=tenant,
        fatura=fat,
        tipo_item=InvoiceItem.TipoItem.EXAME,
        exame=exam,
    )
    item._preencher_de_referencia()
    item.save(update_fields=["descricao", "preco_unitario", "quantidade"])
    fat.persistir_totais()
    return fat


@pytest.mark.django_db
def test_payment_confirm_generates_receipt():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    fatura = _invoice_with_exam(tenant, patient, exam)

    # Emite fatura para permitir atualização de estado/pagamento
    fatura.estado = Invoice.Estado.EMITIDA
    fatura.save(update_fields=["estado"])

    pagamento = Payment.objects.create(
        inquilino=tenant,
        fatura=fatura,
        valor=fatura.total,
        metodo=Payment.Method.DINHEIRO,
    )

    pagamento.confirm()
    fatura.refresh_from_db()
    fatura.gerar_recibo_automatico(pagamento)

    fatura.refresh_from_db()
    recibo = Receipt.objects.filter(pagamento=pagamento).first()

    assert pagamento.status == Payment.Status.CONFIRMADO
    assert pagamento.pago_em is not None
    assert recibo is not None
    assert recibo.fatura == fatura
    assert fatura.estado in {Invoice.Estado.EMITIDA, Invoice.Estado.PAGA}


@pytest.mark.django_db
def test_payment_refund_requires_confirmed_status():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    fatura = _invoice_with_exam(tenant, patient, exam)

    pagamento = Payment.objects.create(
        inquilino=tenant,
        fatura=fatura,
        valor=fatura.total,
        metodo=Payment.Method.DINHEIRO,
    )

    with pytest.raises(ValidationError):
        pagamento.estornar()

    pagamento.confirm()
    pagamento.estornar()
    assert pagamento.status == Payment.Status.ESTORNADO


@pytest.mark.django_db
def test_insurance_payment_requires_insurer_and_authorization():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    fatura = _invoice_with_exam(tenant, patient, exam)

    pagamento = Payment(
        inquilino=tenant,
        nome="Pagamento Seguro",
        fatura=fatura,
        valor=fatura.total,
        metodo=Payment.Method.SEGURO_SAUDE,
    )

    with pytest.raises(ValidationError):
        pagamento.full_clean()

    seguradora = Insurer.objects.create(inquilino=tenant, nome="Seguradora Teste")
    plano = CoveragePlan.objects.create(inquilino=tenant, seguradora=seguradora, nome="Plano Teste")

    pagamento.seguradora = seguradora
    pagamento.plano_cobertura = plano
    pagamento.numero_autorizacao = "AUT-123"
    pagamento.full_clean()


@pytest.mark.django_db
def test_transaction_and_reconciliation():
    trans = Transaction.objects.create(
        referencia_externa="TX123",
        gateway="local",
        status="PEN",
    )
    rec = Reconciliation.objects.create(transacao=trans)
    rec.confirm()
    rec.refresh_from_db()
    assert rec.confirmado is True
    assert rec.data_confirmacao is not None


_paciente = _patient
_exame = _exam
_fatura_com_exame = _invoice_with_exam
test_pagamento_confirma_gera_recibo = test_payment_confirm_generates_receipt
test_pagamento_estorno_exige_confirmado = test_payment_refund_requires_confirmed_status
test_pagamento_seguro_exige_seguradora_e_autorizacao = test_insurance_payment_requires_insurer_and_authorization
test_transacao_e_reconciliacao = test_transaction_and_reconciliation
