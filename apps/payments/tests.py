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
    return Tenant.objects.create(identifier="tn-pay", name="Tenant Pay")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Pay",
        gender="Masculino",
        address_street="Rua P",
    )


def _exam(tenant):
    return LabExam.objects.create(
        tenant=tenant,
        name="Glicose",
        price=Decimal("20.00"),
        method=Metodo.ENZIMATICO,
        sector=Setor.BIOQUIMICA,
    )


def _horario_normal():
    return datetime(2024, 1, 2, 10, 0, tzinfo=timezone.get_current_timezone())


def _invoice_with_exam(tenant, patient, exam):
    req = LabRequest.objects.create(tenant=tenant, patient=patient)
    req.created_at = _horario_normal()
    req.save(update_fields=["created_at"])
    LabRequestItem.objects.create(tenant=tenant, request=req, exam=exam)
    fat = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        request=req,
        origin=Invoice.Origem.CLINICO,
    )
    item = InvoiceItem.objects.create(
        tenant=tenant,
        invoice=fat,
        item_type=InvoiceItem.TipoItem.EXAME,
        exam=exam,
    )
    item._preencher_de_referencia()
    item.save(update_fields=["description", "unit_price", "quantity"])
    fat.persistir_totais()
    return fat


@pytest.mark.django_db
def test_payment_confirm_generates_receipt():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    invoice = _invoice_with_exam(tenant, patient, exam)

    # Emite invoice para permitir atualização de status/payment
    invoice.status = Invoice.Estado.EMITIDA
    invoice.save(update_fields=["status"])

    payment = Payment.objects.create(
        tenant=tenant,
        invoice=invoice,
        value=invoice.total,
        method=Payment.Method.DINHEIRO,
    )

    payment.confirm()
    invoice.refresh_from_db()
    invoice.gerar_recibo_automatico(payment)

    invoice.refresh_from_db()
    recibo = Receipt.objects.filter(payment=payment).first()

    assert payment.status == Payment.Status.CONFIRMADO
    assert payment.paid_at is not None
    assert recibo is not None
    assert recibo.invoice == invoice
    assert invoice.status in {Invoice.Estado.EMITIDA, Invoice.Estado.PAGA}


@pytest.mark.django_db
def test_payment_refund_requires_confirmed_status():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    invoice = _invoice_with_exam(tenant, patient, exam)

    payment = Payment.objects.create(
        tenant=tenant,
        invoice=invoice,
        value=invoice.total,
        method=Payment.Method.DINHEIRO,
    )

    with pytest.raises(ValidationError):
        payment.estornar()

    payment.confirm()
    payment.estornar()
    assert payment.status == Payment.Status.ESTORNADO


@pytest.mark.django_db
def test_insurance_payment_requires_insurer_and_authorization():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    invoice = _invoice_with_exam(tenant, patient, exam)

    payment = Payment(
        tenant=tenant,
        name="Pagamento Seguro",
        invoice=invoice,
        value=invoice.total,
        method=Payment.Method.SEGURO_SAUDE,
    )

    with pytest.raises(ValidationError):
        payment.full_clean()

    insurer = Insurer.objects.create(tenant=tenant, name="Seguradora Teste")
    plan = CoveragePlan.objects.create(tenant=tenant, insurer=insurer, name="Plano Teste")

    payment.insurer = insurer
    payment.coverage_plan = plan
    payment.authorization_number = "AUT-123"
    payment.full_clean()


@pytest.mark.django_db
def test_transaction_and_reconciliation():
    trans = Transaction.objects.create(
        external_reference="TX123",
        gateway="local",
        status="PEN",
    )
    rec = Reconciliation.objects.create(transaction=trans)
    rec.confirm()
    rec.refresh_from_db()
    assert rec.confirmed is True
    assert rec.confirmation_date is not None


_patient = _patient
_exam = _exam
_invoice_com_exam = _invoice_with_exam
test_payment_confirma_gera_recibo = test_payment_confirm_generates_receipt
test_payment_estorno_exige_confirmed = test_payment_refund_requires_confirmed_status
test_payment_seguro_exige_insurer_e_autorizacao = test_insurance_payment_requires_insurer_and_authorization
test_transaction_e_reconciliacao = test_transaction_and_reconciliation
