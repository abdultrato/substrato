from datetime import datetime
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.patient import Patient
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.tenants.models.tenant import Tenant
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from core.constants.laboratory.metodo import Metodo
from core.constants.laboratory.setor import Setor


def _tenant():
    return Tenant.objects.create(identificador="tn-pay", nome="Tenant Pay")


def _paciente(tenant):
    return Patient.objects.create(
        inquilino=tenant,
        nome="Paciente Pay",
        genero="Masculino",
        endereco_rua="Rua P",
    )


def _exame(tenant):
    return LabExam.objects.create(
        inquilino=tenant,
        nome="Glicose",
        preco=Decimal("20.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.BIOQUIMICA,
    )


def _horario_normal():
    return timezone.make_aware(datetime(2024, 1, 2, 10, 0))


def _fatura_com_exame(tenant, paciente, exame):
    req = LabRequest.objects.create(inquilino=tenant, paciente=paciente)
    req.criado_em = _horario_normal()
    req.save(update_fields=["criado_em"])
    LabRequestItem.objects.create(inquilino=tenant, requisicao=req, exame=exame)
    fat = Invoice.objects.create(
        inquilino=tenant,
        paciente=paciente,
        requisicao=req,
        origem=Invoice.Origem.CLINICO,
    )
    item = InvoiceItem.objects.create(
        inquilino=tenant,
        fatura=fat,
        tipo_item=InvoiceItem.TipoItem.EXAME,
        exame=exame,
    )
    item._preencher_de_referencia()
    item.save(update_fields=["descricao", "preco_unitario", "quantidade"])
    fat.persistir_totais()
    return fat


@pytest.mark.django_db
def test_pagamento_confirma_gera_recibo():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)
    fatura = _fatura_com_exame(tenant, paciente, exame)

    # Emite fatura para permitir atualização de estado/pagamento
    fatura.estado = Invoice.Estado.EMITIDA
    fatura.save(update_fields=["estado"])

    pagamento = Payment.objects.create(
        inquilino=tenant,
        fatura=fatura,
        valor=fatura.total,
        metodo=Payment.Metodo.DINHEIRO,
    )

    pagamento.confirmar()
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
def test_pagamento_estorno_exige_confirmado():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)
    fatura = _fatura_com_exame(tenant, paciente, exame)

    pagamento = Payment.objects.create(
        inquilino=tenant,
        fatura=fatura,
        valor=fatura.total,
        metodo=Payment.Metodo.DINHEIRO,
    )

    with pytest.raises(ValidationError):
        pagamento.estornar()

    pagamento.confirmar()
    pagamento.estornar()
    assert pagamento.status == Payment.Status.ESTORNADO


@pytest.mark.django_db
def test_pagamento_seguro_exige_seguradora_e_autorizacao():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)
    fatura = _fatura_com_exame(tenant, paciente, exame)

    pagamento = Payment(
        inquilino=tenant,
        nome="Pagamento Seguro",
        fatura=fatura,
        valor=fatura.total,
        metodo=Payment.Metodo.SEGURO_SAUDE,
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
def test_transacao_e_reconciliacao():
    trans = Transaction.objects.create(
        referencia_externa="TX123",
        gateway="local",
        status="PEN",
    )
    rec = Reconciliation.objects.create(transacao=trans)
    rec.confirmar()
    rec.refresh_from_db()
    assert rec.confirmado is True
    assert rec.data_confirmacao is not None
