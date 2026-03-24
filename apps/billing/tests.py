from datetime import datetime, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.medical_exam import MedicalExam
from apps.clinical.models.patient import Patient
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.nursing.models import (
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
)
from apps.pharmacy.models.product_category import ProductCategory
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.tenants.models.tenant import Tenant
from core.constants.medical_exam.metodo_exame_medico import MetodoExameMedico
from core.constants.medical_exam.setor_exame_medico import SetorExameMedico
from core.constants.laboratory.metodo import Metodo
from core.constants.laboratory.setor import Setor


def _tenant():
    return Tenant.objects.create(identificador="tn-fat", nome="Tenant Fat")


def _paciente(tenant):
    return Patient.objects.create(
        inquilino=tenant,
        nome="Paciente Fat",
        genero="Masculino",
        endereco_rua="Rua Y",
    )


def _exame(tenant):
    return LabExam.objects.create(
        inquilino=tenant,
        nome="Hemograma",
        preco=Decimal("30.00"),
        metodo=Metodo.ENZIMATICO,
        setor=Setor.HEMATOLOGIA,
    )


def _exame_medico(tenant):
    return MedicalExam.objects.create(
        inquilino=tenant,
        nome="Ecografia abdominal",
        preco=Decimal("150.00"),
        metodo=MetodoExameMedico.ULTRASSONOGRAFIA,
        setor=SetorExameMedico.RADIOLOGIA,
    )


def _horario_normal():
    return timezone.make_aware(datetime(2024, 1, 2, 10, 0))


@pytest.mark.django_db
def test_fatura_clinico_recalcula_totais():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)
    req = LabRequest.objects.create(inquilino=tenant, paciente=paciente)
    req.criado_em = _horario_normal()
    req.save(update_fields=["criado_em"])
    LabRequestItem.objects.create(inquilino=tenant, requisicao=req, exame=exame)

    fatura = Invoice.objects.create(
        inquilino=tenant,
        paciente=paciente,
        requisicao=req,
        origem=Invoice.Origem.CLINICO,
    )

    item = InvoiceItem.objects.create(
        inquilino=tenant,
        fatura=fatura,
        tipo_item=InvoiceItem.TipoItem.EXAME,
        exame=exame,
    )
    item._preencher_de_referencia()
    item.save(update_fields=["descricao", "preco_unitario", "quantidade"])

    fatura.persistir_totais()
    fatura.refresh_from_db()

    assert fatura.subtotal == exame.preco
    assert fatura.total == fatura.subtotal - fatura.iva_valor
    assert fatura.valor_paciente == fatura.total


@pytest.mark.django_db
def test_fatura_clinico_sincroniza_exame_medico():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame_medico = _exame_medico(tenant)

    req = LabRequest.objects.create(
        inquilino=tenant,
        paciente=paciente,
        tipo=LabRequest.Tipo.EXAME_MEDICO,
    )
    req.criado_em = _horario_normal()
    req.save(update_fields=["criado_em"])
    LabRequestItem.objects.create(
        inquilino=tenant,
        requisicao=req,
        exame_medico=exame_medico,
    )

    fatura = Invoice.objects.create(
        inquilino=tenant,
        paciente=paciente,
        requisicao=req,
        origem=Invoice.Origem.CLINICO,
    )

    fatura.sincronizar_itens_da_origem()
    fatura.refresh_from_db()

    itens = list(fatura.itens.filter(deletado=False))
    assert len(itens) == 1

    item = itens[0]
    assert item.tipo_item == InvoiceItem.TipoItem.EXAME_MEDICO
    assert item.exame_medico_id == exame_medico.id
    assert item.exame_id is None
    assert item.descricao == exame_medico.nome
    assert item.preco_unitario == exame_medico.preco
    assert fatura.subtotal == exame_medico.preco


@pytest.mark.django_db
def test_item_ajuste_manual_requer_descricao():
    tenant = _tenant()
    paciente = _paciente(tenant)
    fatura = Invoice.objects.create(inquilino=tenant, paciente=paciente, origem=Invoice.Origem.CLINICO)

    item = InvoiceItem(
        inquilino=tenant,
        fatura=fatura,
        tipo_item=InvoiceItem.TipoItem.AJUSTE,
        quantidade=Decimal("1.00"),
        preco_unitario=Decimal("5.00"),
        descricao="",
    )
    with pytest.raises(ValidationError):
        item.full_clean()


@pytest.mark.django_db
def test_item_exame_origem_incompativel():
    tenant = _tenant()
    paciente = _paciente(tenant)
    exame = _exame(tenant)
    fatura = Invoice.objects.create(inquilino=tenant, paciente=paciente, origem=Invoice.Origem.FARMACIA)

    item = InvoiceItem(
        inquilino=tenant,
        fatura=fatura,
        tipo_item=InvoiceItem.TipoItem.EXAME,
        exame=exame,
        quantidade=Decimal("1.00"),
        preco_unitario=exame.preco,
    )
    with pytest.raises(ValidationError):
        item.full_clean()


@pytest.mark.django_db
def test_fatura_enfermagem_bloqueia_emissao_quando_material_sem_estoque_e_libera_apos_atualizacao():
    tenant = _tenant()
    paciente = _paciente(tenant)

    proc = Procedure.objects.create(paciente=paciente)

    cat = ProductCategory.objects.create(inquilino=tenant, nome="Cat Mat", descricao="")
    produto = Product.objects.create(
        inquilino=tenant,
        nome="Soro",
        tipo=Product.TipoProduto.MATERIAL,
        preco_venda=Decimal("5.00"),
        categoria=cat,
    )

    catalogo = ProcedureCatalog.objects.create(
        inquilino=tenant,
        nome="Soro IV",
        preco_padrao=Decimal("10.00"),
    )
    ProcedureCatalogMaterial.objects.create(
        inquilino=tenant,
        catalogo=catalogo,
        produto=produto,
        quantidade_padrao=Decimal("1.00"),
        custo_unitario_padrao=Decimal("2.50"),
    )

    ProcedureItem.objects.create(
        inquilino=tenant,
        procedimento=proc,
        catalogo=catalogo,
        quantidade=1,
    )

    fatura = Invoice.objects.create(
        inquilino=tenant,
        origem=Invoice.Origem.ENFERMAGEM,
        procedimento=proc,
    )
    fatura.sincronizar_itens_da_origem()

    with pytest.raises(ValidationError) as exc:
        fatura.emitir()

    assert "Estoque insuficiente" in str(exc.value)
    assert "itens" in getattr(exc.value, "message_dict", {})

    lote = Lot.objects.create(
        inquilino=tenant,
        produto=produto,
        numero_lote="L999",
        validade=timezone.localdate() + timedelta(days=60),
        quantidade_inicial=10,
    )

    fatura.emitir()
    fatura.refresh_from_db()
    assert fatura.estado == Invoice.Estado.EMITIDA

    material = proc.materiais.get(produto=produto)
    material.refresh_from_db()
    assert material.lote_id == lote.id
    assert material.movimento_estoque_id is not None
