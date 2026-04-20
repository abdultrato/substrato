"""Testes de faturamento com comentários explicativos."""

from datetime import datetime, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.medical_exam import MedicalExam
from apps.clinical.models.patient import Patient
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.nursing.models import (
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureMaterial,
)
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ProductCategory
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.sector import Sector
from core.constants.medical_exam.medical_exam_method import MedicalExamMethod
from core.constants.medical_exam.medical_exam_sector import MedicalExamSector


def _tenant():
    """Cria tenant de teste para faturamento."""
    return Tenant.objects.create(identifier="tn-fat", name="Tenant Fat")


def _patient(tenant):
    """Helper para criar paciente básico."""
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Fat",
        gender="Masculino",
        address_street="Rua Y",
    )


def _exam(tenant):
    """Cria exame laboratorial padrão."""
    return LabExam.objects.create(
        tenant=tenant,
        name="Hemograma",
        price=Decimal("30.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
    )


def _medical_exam(tenant):
    """Cria exame médico padrão."""
    return MedicalExam.objects.create(
        tenant=tenant,
        name="Ecografia abdominal",
        price=Decimal("150.00"),
        method=MedicalExamMethod.ULTRASSONOGRAFIA,
        sector=MedicalExamSector.RADIOLOGIA,
    )


def _consultation(tenant, patient):
    return MedicalConsultation.objects.create(
        tenant=tenant,
        patient=patient,
        type="Consulta geral",
        price=Decimal("120.00"),
    )


def _horario_normal():
    """Retorna horário normal (sem multa de horário)."""
    return datetime(2024, 1, 2, 10, 0, tzinfo=timezone.get_current_timezone())


@pytest.mark.django_db
def test_clinical_invoice_recalculates_totals():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    req = LabRequest.objects.create(tenant=tenant, patient=patient)
    req.created_at = _horario_normal()
    req.save(update_fields=["created_at"])
    LabRequestItem.objects.create(tenant=tenant, request=req, exam=exam)

    invoice = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        request=req,
        origin=Invoice.Origin.CLINICAL,
    )

    item = InvoiceItem.objects.create(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.EXAME,
        exam=exam,
    )
    item._fill_from_reference()
    item.save(update_fields=["description", "unit_price", "quantity"])

    invoice.persist_totals()
    invoice.refresh_from_db()

    assert invoice.subtotal == exam.price
    assert invoice.total == invoice.subtotal + invoice.vat_amount
    assert invoice.total_a_pagar == invoice.total
    assert invoice.patient_amount == invoice.total


@pytest.mark.django_db
def test_invoice_caps_patient_balance_when_insurance_exceeds_total():
    tenant = _tenant()
    patient = _patient(tenant)

    invoice = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        origin=Invoice.Origin.MIXED,
        insurance_amount=Decimal("999.00"),
    )

    InvoiceItem.objects.create(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.AJUSTE,
        description="Ajuste manual",
        quantity=Decimal("1.00"),
        unit_price=Decimal("10.00"),
        applies_vat=False,
    )

    invoice.persist_totals()
    invoice.refresh_from_db()

    assert invoice.total == Decimal("10.00")
    assert invoice.total_a_pagar == Decimal("10.00")
    assert invoice.insurance_amount == invoice.total
    assert invoice.patient_amount == Decimal("0.00")


@pytest.mark.django_db
def test_clinical_invoice_syncs_medical_exam():
    tenant = _tenant()
    patient = _patient(tenant)
    medical_exam = _medical_exam(tenant)

    req = LabRequest.objects.create(
        tenant=tenant,
        patient=patient,
        type=LabRequest.Type.MEDICAL_EXAM,
    )
    req.created_at = _horario_normal()
    req.save(update_fields=["created_at"])
    LabRequestItem.objects.create(
        tenant=tenant,
        request=req,
        medical_exam=medical_exam,
    )

    invoice = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        request=req,
        origin=Invoice.Origin.CLINICAL,
    )

    invoice.sync_items_from_origin()
    invoice.refresh_from_db()

    items = list(invoice.items.filter(deleted=False))
    assert len(items) == 1

    item = items[0]
    assert item.item_type == InvoiceItem.TipoItem.EXAME_MEDICO
    assert item.medical_exam_id == medical_exam.id
    assert item.exam_id is None
    assert item.description == medical_exam.name
    assert item.unit_price == medical_exam.price
    assert invoice.subtotal == medical_exam.price


@pytest.mark.django_db
def test_manual_adjustment_item_requires_description():
    tenant = _tenant()
    patient = _patient(tenant)
    invoice = Invoice.objects.create(tenant=tenant, patient=patient, origin=Invoice.Origin.CLINICAL)

    item = InvoiceItem(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.AJUSTE,
        quantity=Decimal("1.00"),
        unit_price=Decimal("5.00"),
        description="",
    )
    with pytest.raises(ValidationError):
        item.full_clean()


@pytest.mark.django_db
def test_exam_item_allows_flexible_source_classification():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    invoice = Invoice.objects.create(tenant=tenant, patient=patient, origin=Invoice.Origin.PHARMACY)

    item = InvoiceItem(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.EXAME,
        exam=exam,
        quantity=Decimal("1.00"),
        unit_price=exam.price,
    )
    item.full_clean()


@pytest.mark.django_db
def test_invoice_allows_duplicate_pharmacy_product_items_without_sale_item():
    tenant = _tenant()
    patient = _patient(tenant)
    category = ProductCategory.objects.create(tenant=tenant, name="Cat FAR", description="")
    product = Product.objects.create(
        tenant=tenant,
        name="Analgésico",
        type=Product.ProductType.MEDICAMENTO,
        sale_price=Decimal("8.00"),
        category=category,
    )

    invoice = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        origin=Invoice.Origin.PHARMACY,
    )

    first = InvoiceItem(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.ITEM_VENDA,
        product=product,
        quantity=Decimal("1.00"),
        unit_price=Decimal("0.00"),
    )
    first.full_clean()
    first.save()

    second = InvoiceItem(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.ITEM_VENDA,
        product=product,
        quantity=Decimal("2.00"),
        unit_price=Decimal("0.00"),
    )
    second.full_clean()
    second.save()

    assert invoice.items.filter(product=product, deleted=False).count() == 2
    first.refresh_from_db()
    second.refresh_from_db()
    assert first.unit_price == product.sale_price
    assert second.unit_price == product.sale_price
    assert first.description == product.name
    assert second.description == product.name


@pytest.mark.django_db
def test_consultation_item_inherits_price_from_consultation():
    tenant = _tenant()
    patient = _patient(tenant)
    consultation = _consultation(tenant, patient)

    invoice = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        origin=Invoice.Origin.CONSULTATION,
    )

    item = InvoiceItem.objects.create(
        tenant=tenant,
        invoice=invoice,
        item_type=InvoiceItem.TipoItem.CONSULTATION,
        consultation=consultation,
        quantity=Decimal("3.00"),
        unit_price=Decimal("0.00"),
    )

    item.refresh_from_db()
    assert item.unit_price == consultation.price
    assert item.quantity == Decimal("1.00")
    assert item.description == consultation.type


@pytest.mark.django_db
def test_nursing_invoice_blocks_issuance_without_inventory_and_releases_after_update():
    tenant = _tenant()
    patient = _patient(tenant)

    proc = Procedure.objects.create(patient=patient)

    cat = ProductCategory.objects.create(tenant=tenant, name="Cat Mat", description="")
    product = Product.objects.create(
        tenant=tenant,
        name="Soro",
        type=Product.ProductType.MATERIAL,
        sale_price=Decimal("5.00"),
        category=cat,
    )

    catalog = ProcedureCatalog.objects.create(
        tenant=tenant,
        name="Soro IV",
        default_price=Decimal("10.00"),
    )
    ProcedureCatalogMaterial.objects.create(
        tenant=tenant,
        catalog=catalog,
        product=product,
        default_quantity=Decimal("1.00"),
        default_unit_cost=Decimal("2.50"),
    )

    procedure_item = ProcedureItem.objects.create(
        tenant=tenant,
        procedure=proc,
        catalog=catalog,
        quantity=1,
    )
    procedure_item.mark_executed()
    procedure_item.mark_completed()

    invoice = Invoice.objects.create(
        tenant=tenant,
        origin=Invoice.Origin.NURSING,
        procedure=proc,
    )
    invoice.sync_items_from_origin()

    with pytest.raises(ValidationError) as exc:
        invoice.issue()

    assert "Estoque insuficiente" in str(exc.value)
    assert "items" in getattr(exc.value, "message_dict", {})

    lot = Lot.objects.create(
        tenant=tenant,
        product=product,
        lot_number="L999",
        expiration_date=timezone.localdate() + timedelta(days=60),
        initial_quantity=10,
    )

    invoice.issue()
    invoice.refresh_from_db()
    assert invoice.status == Invoice.Status.ISSUED

    material = proc.materiais.get(product=product)
    material.refresh_from_db()
    assert material.lot_id == lot.id
    assert material.inventory_movement_id is not None


@pytest.mark.django_db
def test_legacy_procedure_allows_multiple_invoices():
    tenant = _tenant()
    patient = _patient(tenant)
    proc = Procedure.objects.create(patient=patient)

    invoice_1 = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        origin=Invoice.Origin.NURSING,
        procedure=proc,
    )
    invoice_2 = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        origin=Invoice.Origin.NURSING,
        procedure=proc,
    )

    invoices = Invoice.objects.filter(patient=patient, procedure=proc, deleted=False).order_by("created_at", "id")
    assert invoices.count() == 2
    assert invoices.first().id == invoice_1.id
    assert invoices.last().id == invoice_2.id

    # Compatibilidade legado: retorna a mais recente.
    assert proc.invoice.id == invoice_2.id


@pytest.mark.django_db
def test_nursing_invoice_sync_lists_only_used_and_priced_items_and_materials():
    tenant = _tenant()
    patient = _patient(tenant)
    proc = Procedure.objects.create(patient=patient)
    cat = ProductCategory.objects.create(tenant=tenant, name="Cat Mat 2", description="")
    product_priced = Product.objects.create(
        tenant=tenant,
        name="Gaze",
        type=Product.ProductType.MATERIAL,
        sale_price=Decimal("4.00"),
        category=cat,
    )
    product_free = Product.objects.create(
        tenant=tenant,
        name="Fita sem custo",
        type=Product.ProductType.MATERIAL,
        sale_price=Decimal("0.00"),
        category=cat,
    )

    used_item = ProcedureItem.objects.create(
        tenant=tenant,
        procedure=proc,
        description="Curativo realizado",
        quantity=1,
        unit_price=Decimal("12.00"),
    )
    used_item.mark_executed()
    used_item.mark_completed()
    used_item.refresh_from_db()
    assert used_item.billed is False

    pending_item = ProcedureItem.objects.create(
        tenant=tenant,
        procedure=proc,
        description="Curativo pendente",
        quantity=1,
        unit_price=Decimal("7.00"),
    )

    catalog_free = ProcedureCatalog.objects.create(
        tenant=tenant,
        name="Curativo sem preço",
        default_price=Decimal("0.00"),
    )
    free_item = ProcedureItem.objects.create(
        tenant=tenant,
        procedure=proc,
        catalog=catalog_free,
        quantity=1,
    )
    free_item.mark_executed()
    free_item.mark_completed()

    priced_material = ProcedureMaterial(
        tenant=tenant,
        procedure=proc,
        procedure_item=used_item,
        product=product_priced,
        quantity=1,
        unit_cost=Decimal("2.00"),
    )
    priced_material.save(alocar_estoque=False)

    free_material = ProcedureMaterial(
        tenant=tenant,
        procedure=proc,
        procedure_item=used_item,
        product=product_free,
        quantity=1,
        unit_cost=Decimal("0.00"),
    )
    free_material.save(alocar_estoque=False)

    pending_item_material = ProcedureMaterial(
        tenant=tenant,
        procedure=proc,
        procedure_item=pending_item,
        product=product_priced,
        quantity=1,
        unit_cost=Decimal("3.00"),
    )
    pending_item_material.save(alocar_estoque=False)

    invoice = Invoice.objects.create(
        tenant=tenant,
        origin=Invoice.Origin.NURSING,
        procedure=proc,
    )
    invoice.sync_items_from_origin()
    invoice.refresh_from_db()

    itens = invoice.items.filter(deleted=False)
    assert itens.filter(
        item_type=InvoiceItem.TipoItem.PROCEDIMENTO_ITEM,
        procedure_item=used_item,
    ).exists()
    assert not itens.filter(
        item_type=InvoiceItem.TipoItem.PROCEDIMENTO_ITEM,
        procedure_item=pending_item,
    ).exists()
    assert not itens.filter(
        item_type=InvoiceItem.TipoItem.PROCEDIMENTO_ITEM,
        procedure_item=free_item,
    ).exists()

    assert itens.filter(
        item_type=InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL,
        procedure_material=priced_material,
    ).exists()
    assert not itens.filter(
        item_type=InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL,
        procedure_material=free_material,
    ).exists()
    assert not itens.filter(
        item_type=InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL,
        procedure_material=pending_item_material,
    ).exists()


@pytest.mark.django_db
def test_sync_items_from_origin_allows_missing_source_reference():
    tenant = _tenant()
    patient = _patient(tenant)
    invoice = Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        origin=Invoice.Origin.CLINICAL,
    )

    invoice.sync_items_from_origin()
    invoice.refresh_from_db()

    assert invoice.items.filter(deleted=False).count() == 0
    assert invoice.total == Decimal("0.00")
