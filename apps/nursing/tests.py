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
    return Tenant.objects.create(identifier="tn-enf", name="Tenant Enf")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente",
        gender="Masculino",
        address_street="Rua X",
    )


def _professional(tenant):
    User = get_user_model()
    return User.objects.create_user(
        username="prof-enf",
        email="prof@enf.test",
        password="123456",
        name="Prof Enf",
        tenant=tenant,
    )


def _product(tenant):
    cat = ProductCategory.objects.create(tenant=tenant, name="Cat", description="")
    return Product.objects.create(
        tenant=tenant,
        name="Soro",
        type=Product.TipoProduto.MATERIAL,
        sale_price=Decimal("5.00"),
        category=cat,
    )


def _lot(product):
    return Lot.objects.create(
        tenant=product.tenant,
        product=product,
        lot_number="L123",
        expiration_date=timezone.localdate() + timedelta(days=90),
        initial_quantity=10,
    )


@pytest.mark.django_db
def test_evolution_and_prescription_propagate_tenant():
    tenant = _tenant()
    patient = _patient(tenant)

    evo = NursingEvolution.objects.create(patient=patient, observation="Evolução")
    pre = NursingPrescription.objects.create(patient=patient, description="Prescrição")

    assert evo.tenant == tenant
    assert pre.tenant == tenant


@pytest.mark.django_db
def test_procedure_recalculates_totals_with_item_value():
    tenant = _tenant()
    patient = _patient(tenant)
    prof = _professional(tenant)

    proc = Procedure.objects.create(patient=patient, professional=prof)

    item = ProcedureItem.objects.create(
        procedure=proc,
        tenant=tenant,
        description="Curativo",
        quantity=1,
        unit_price=Decimal("10.00"),
    )
    piv = getattr(item, "value", None)
    if piv:
        piv.unit_price = Decimal("10.00")
        piv.save()
    else:
        ProcedureItemValue.objects.create(item=item, tenant=tenant, unit_price=Decimal("10.00"))

    proc.recalculate_totals()
    proc.refresh_from_db()

    assert proc.services_subtotal == Decimal("10.00")
    assert proc.total == Decimal("10.00") or proc.total >= proc.services_subtotal


@pytest.mark.django_db
def test_procedure_catalog_material_propagacao():
    tenant = _tenant()
    catalog = ProcedureCatalog.objects.create(tenant=tenant, name="Curativo")
    product = _product(tenant)

    pcm = ProcedureCatalogMaterial.objects.create(
        catalog=catalog,
        product=product,
        tenant=tenant,
        default_quantity=Decimal("1.0"),
        default_unit_cost=Decimal("2.50"),
    )

    assert pcm.tenant == tenant
    assert pcm.catalog.tenant == tenant


@pytest.mark.django_db
def test_procedure_item_validates_description_or_catalog():
    tenant = _tenant()
    patient = _patient(tenant)
    proc = Procedure.objects.create(patient=patient)

    item = ProcedureItem(procedure=proc, tenant=tenant, quantity=1, unit_price=Decimal("1.00"))
    with pytest.raises(ValidationError):
        item.full_clean()


@pytest.mark.django_db
def test_procedure_material_line_total_uses_value():
    tenant = _tenant()
    patient = _patient(tenant)
    proc = Procedure.objects.create(patient=patient)
    product = _product(tenant)
    lot = _lot(product)

    material = ProcedureMaterial.objects.create(
        tenant=tenant,
        procedure=proc,
        product=product,
        lot=lot,
        quantity=1,
        unit_cost=Decimal("3.00"),
    )
    pmv = getattr(material, "value", None)
    if pmv:
        pmv.unit_cost = Decimal("3.00")
        pmv.save()
    else:
        ProcedureMaterialValue.objects.create(material=material, tenant=tenant, unit_cost=Decimal("3.00"))

    assert material.tenant == tenant
    assert material.total_linha == Decimal("3.00")


@pytest.mark.django_db
def test_record_and_vital_sign():
    tenant = _tenant()
    patient = _patient(tenant)

    record = NursingRecord.objects.create(patient=patient, tenant=tenant, observation="Obs")
    sv = NursingVitalSign.objects.create(record=record, tenant=tenant, temperature_c=Decimal("36.5"))

    assert record.tenant == tenant
    assert sv.tenant == tenant
    assert sv.record == record


@pytest.mark.django_db
def test_procedure_item_catalog_creates_pending_material_without_inventory():
    tenant = _tenant()
    patient = _patient(tenant)

    proc = Procedure.objects.create(patient=patient)
    product = _product(tenant)

    catalog = ProcedureCatalog.objects.create(tenant=tenant, name="Curativo", default_price=Decimal("10.00"))
    ProcedureCatalogMaterial.objects.create(
        tenant=tenant,
        catalog=catalog,
        product=product,
        default_quantity=Decimal("1.00"),
        default_unit_cost=Decimal("2.50"),
    )

    item = ProcedureItem.objects.create(
        tenant=tenant,
        procedure=proc,
        catalog=catalog,
        quantity=1,
    )

    materiais = list(item.materiais_gerados.filter(deleted=False))
    assert len(materiais) == 1

    material = materiais[0]
    assert material.product_id == product.id
    assert material.lot_id is None
    assert material.inventory_movement_id is None


_patient = _patient
test_evolucao_prescription_propagam_tenant = test_evolution_and_prescription_propagate_tenant
test_procedure_recalcula_totais_com_item_value = test_procedure_recalculates_totals_with_item_value
test_procedure_item_validacao_description_ou_catalog = test_procedure_item_validates_description_or_catalog
test_procedure_material_total_linha_usa_value = test_procedure_material_line_total_uses_value
test_record_e_sinal_vital = test_record_and_vital_sign
test_procedure_item_catalog_cria_material_pendente_quando_sem_estoque = (
    test_procedure_item_catalog_creates_pending_material_without_inventory
)
