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
from apps.nursing.models import (
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
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
    return Tenant.objects.create(identifier="tn-fat", name="Tenant Fat")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Fat",
        gender="Masculino",
        address_street="Rua Y",
    )


def _exam(tenant):
    return LabExam.objects.create(
        tenant=tenant,
        name="Hemograma",
        price=Decimal("30.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
    )


def _medical_exam(tenant):
    return MedicalExam.objects.create(
        tenant=tenant,
        name="Ecografia abdominal",
        price=Decimal("150.00"),
        method=MedicalExamMethod.ULTRASSONOGRAFIA,
        sector=MedicalExamSector.RADIOLOGIA,
    )


def _horario_normal():
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
def test_exam_item_has_incompatible_source():
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
    with pytest.raises(ValidationError):
        item.full_clean()


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

    ProcedureItem.objects.create(
        tenant=tenant,
        procedure=proc,
        catalog=catalog,
        quantity=1,
    )

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
