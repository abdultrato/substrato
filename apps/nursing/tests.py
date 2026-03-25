from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.nursing.models import (
    NursingEvolution,
    NursingPrescription,
    NursingRecord,
    NursingVitalSign,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureItemValue,
    ProcedureMaterial,
    ProcedureMaterialValue,
)
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ProductCategory
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(identificador="tn-enf", nome="Tenant Enf")


def _patient(tenant):
    return Patient.objects.create(
        inquilino=tenant,
        nome="Paciente",
        genero="Masculino",
        endereco_rua="Rua X",
    )


def _profissional(tenant):
    User = get_user_model()
    return User.objects.create_user(
        username="prof-enf",
        email="prof@enf.test",
        password="123456",
        nome="Prof Enf",
        inquilino=tenant,
    )


def _produto(tenant):
    cat = ProductCategory.objects.create(inquilino=tenant, nome="Cat", descricao="")
    return Product.objects.create(
        inquilino=tenant,
        nome="Soro",
        tipo=Product.TipoProduto.MATERIAL,
        preco_venda=Decimal("5.00"),
        categoria=cat,
    )


def _lote(produto):
    return Lot.objects.create(
        inquilino=produto.inquilino,
        produto=produto,
        numero_lote="L123",
        validade=timezone.localdate() + timedelta(days=90),
        quantidade_inicial=10,
    )


@pytest.mark.django_db
def test_evolution_and_prescription_propagate_tenant():
    tenant = _tenant()
    patient = _patient(tenant)

    evo = NursingEvolution.objects.create(paciente=patient, observacao="Evolução")
    pre = NursingPrescription.objects.create(paciente=patient, descricao="Prescrição")

    assert evo.inquilino == tenant
    assert pre.inquilino == tenant


@pytest.mark.django_db
def test_procedure_recalculates_totals_with_item_value():
    tenant = _tenant()
    patient = _patient(tenant)
    prof = _profissional(tenant)

    proc = Procedure.objects.create(paciente=patient, profissional=prof)

    item = ProcedureItem.objects.create(
        procedimento=proc,
        inquilino=tenant,
        descricao="Curativo",
        quantidade=1,
        preco_unitario=Decimal("10.00"),
    )
    piv = getattr(item, "valor", None)
    if piv:
        piv.preco_unitario = Decimal("10.00")
        piv.save()
    else:
        ProcedureItemValue.objects.create(item=item, inquilino=tenant, preco_unitario=Decimal("10.00"))

    proc.recalculate_totals()
    proc.refresh_from_db()

    assert proc.subtotal_servicos == Decimal("10.00")
    assert proc.total == Decimal("10.00") or proc.total >= proc.subtotal_servicos


@pytest.mark.django_db
def test_procedimento_catalogo_material_propagacao():
    tenant = _tenant()
    catalogo = ProcedureCatalog.objects.create(inquilino=tenant, nome="Curativo")
    produto = _produto(tenant)

    pcm = ProcedureCatalogMaterial.objects.create(
        catalogo=catalogo,
        produto=produto,
        inquilino=tenant,
        quantidade_padrao=Decimal("1.0"),
        custo_unitario_padrao=Decimal("2.50"),
    )

    assert pcm.inquilino == tenant
    assert pcm.catalogo.inquilino == tenant


@pytest.mark.django_db
def test_procedure_item_validates_description_or_catalog():
    tenant = _tenant()
    patient = _patient(tenant)
    proc = Procedure.objects.create(paciente=patient)

    item = ProcedureItem(procedimento=proc, inquilino=tenant, quantidade=1, preco_unitario=Decimal("1.00"))
    with pytest.raises(ValidationError):
        item.full_clean()


@pytest.mark.django_db
def test_procedure_material_line_total_uses_value():
    tenant = _tenant()
    patient = _patient(tenant)
    proc = Procedure.objects.create(paciente=patient)
    produto = _produto(tenant)
    lote = _lote(produto)

    material = ProcedureMaterial.objects.create(
        inquilino=tenant,
        procedimento=proc,
        produto=produto,
        lote=lote,
        quantidade=1,
        custo_unitario=Decimal("3.00"),
    )
    pmv = getattr(material, "valor", None)
    if pmv:
        pmv.custo_unitario = Decimal("3.00")
        pmv.save()
    else:
        ProcedureMaterialValue.objects.create(material=material, inquilino=tenant, custo_unitario=Decimal("3.00"))

    assert material.inquilino == tenant
    assert material.total_linha == Decimal("3.00")


@pytest.mark.django_db
def test_record_and_vital_sign():
    tenant = _tenant()
    patient = _patient(tenant)

    registro = NursingRecord.objects.create(paciente=patient, inquilino=tenant, observacao="Obs")
    sv = NursingVitalSign.objects.create(registro=registro, inquilino=tenant, temperatura_c=Decimal("36.5"))

    assert registro.inquilino == tenant
    assert sv.inquilino == tenant
    assert sv.registro == registro


@pytest.mark.django_db
def test_procedure_item_catalog_creates_pending_material_without_inventory():
    tenant = _tenant()
    patient = _patient(tenant)

    proc = Procedure.objects.create(paciente=patient)
    produto = _produto(tenant)

    catalogo = ProcedureCatalog.objects.create(inquilino=tenant, nome="Curativo", preco_padrao=Decimal("10.00"))
    ProcedureCatalogMaterial.objects.create(
        inquilino=tenant,
        catalogo=catalogo,
        produto=produto,
        quantidade_padrao=Decimal("1.00"),
        custo_unitario_padrao=Decimal("2.50"),
    )

    item = ProcedureItem.objects.create(
        inquilino=tenant,
        procedimento=proc,
        catalogo=catalogo,
        quantidade=1,
    )

    materiais = list(item.materiais_gerados.filter(deletado=False))
    assert len(materiais) == 1

    material = materiais[0]
    assert material.produto_id == produto.id
    assert material.lote_id is None
    assert material.movimento_estoque_id is None


_paciente = _patient
test_evolucao_prescricao_propagam_inquilino = test_evolution_and_prescription_propagate_tenant
test_procedimento_recalcula_totais_com_item_valor = test_procedure_recalculates_totals_with_item_value
test_procedimento_item_validacao_descricao_ou_catalogo = test_procedure_item_validates_description_or_catalog
test_procedimento_material_total_linha_usa_valor = test_procedure_material_line_total_uses_value
test_registro_e_sinal_vital = test_record_and_vital_sign
test_procedimento_item_catalogo_cria_material_pendente_quando_sem_estoque = (
    test_procedure_item_catalog_creates_pending_material_without_inventory
)
