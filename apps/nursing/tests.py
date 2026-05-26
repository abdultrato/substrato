from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest
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
    Ward,
    WardAdmission,
    WardBed,
)
from apps.payments.models.payment import Payment
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ProductCategory
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(
        identifier="tn-enf",
        name="Tenant Enf",
        domain="tenant-enf.local",
        active=True,
    )


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


def _authenticate_admin(tenant, api_client):
    User = get_user_model()
    user = User.objects.create_user(
        username="admin-enf",
        email="admin@enf.test",
        password="123456",
        name="Admin Enf",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


def _product(tenant):
    cat = ProductCategory.objects.create(tenant=tenant, name="Cat", description="")
    return Product.objects.create(
        tenant=tenant,
        name="Soro",
        type=Product.ProductType.MATERIAL,
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

    proc = Procedure.objects.create(patient=patient)
    proc.professional.add(prof)

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
def test_procedure_catalog_material_inherits_unit_cost_from_product():
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

    pcm.refresh_from_db()
    assert pcm.default_unit_cost == product.sale_price


@pytest.mark.django_db
def test_procedure_catalog_material_allows_duplicate_product_in_same_catalog():
    tenant = _tenant()
    catalog = ProcedureCatalog.objects.create(tenant=tenant, name="Curativo")
    product = _product(tenant)

    first = ProcedureCatalogMaterial.objects.create(
        catalog=catalog,
        product=product,
        tenant=tenant,
        default_quantity=Decimal("1.0"),
        default_unit_cost=Decimal("2.50"),
    )

    second = ProcedureCatalogMaterial.objects.create(
        catalog=catalog,
        product=product,
        tenant=tenant,
        default_quantity=Decimal("2.0"),
        default_unit_cost=Decimal("3.00"),
    )

    assert first.pk != second.pk
    assert (
        ProcedureCatalogMaterial.objects.filter(
            catalog=catalog,
            product=product,
            deleted=False,
        ).count()
        == 2
    )


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
    sv = NursingVitalSign.objects.create(record=record, patient=patient, tenant=tenant, temperature_c=Decimal("36.5"))

    assert record.tenant == tenant
    assert sv.tenant == tenant
    assert sv.record == record


@pytest.mark.django_db
def test_nursing_record_rejects_lab_request_from_other_patient():
    tenant = _tenant()
    patient = _patient(tenant)
    other_patient = Patient.objects.create(
        tenant=tenant,
        name="Outro paciente",
        gender="Masculino",
        address_street="Rua Y",
    )
    lab_request = LabRequest.objects.create(tenant=tenant, patient=other_patient)

    with pytest.raises(ValidationError):
        NursingRecord.objects.create(
            tenant=tenant,
            patient=patient,
            lab_request=lab_request,
            observation="Obs",
        )


@pytest.mark.django_db
def test_vital_sign_rejects_patient_different_from_record():
    tenant = _tenant()
    patient = _patient(tenant)
    other_patient = Patient.objects.create(
        tenant=tenant,
        name="Outro paciente",
        gender="Masculino",
        address_street="Rua Y",
    )
    record = NursingRecord.objects.create(patient=patient, tenant=tenant, observation="Obs")

    with pytest.raises(ValidationError):
        NursingVitalSign.objects.create(
            record=record,
            patient=other_patient,
            tenant=tenant,
            temperature_c=Decimal("36.5"),
        )


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


@pytest.mark.django_db
def test_procedure_item_workflow_transitions_sync_procedure_status():
    tenant = _tenant()
    patient = _patient(tenant)
    professional = _professional(tenant)
    proc = Procedure.objects.create(patient=patient)

    item = ProcedureItem.objects.create(
        procedure=proc,
        tenant=tenant,
        description="Curativo simples",
        quantity=1,
        unit_price=Decimal("10.00"),
    )

    proc.refresh_from_db()
    assert proc.workflow_status == Procedure.WorkflowStatus.REQUESTED
    assert proc.billing_status == Procedure.BillingStatus.PENDING

    item.mark_executed(professional=professional)
    item.refresh_from_db()
    proc.refresh_from_db()

    assert item.execution_status == ProcedureItem.ExecutionStatus.EXECUTED
    assert item.performed is True
    assert item.executed_at is not None
    assert proc.workflow_status == Procedure.WorkflowStatus.EXECUTED
    assert proc.executed_at is not None
    assert proc.professional.filter(id=professional.id).exists()

    item.mark_completed()
    item.refresh_from_db()
    proc.refresh_from_db()

    assert item.execution_status == ProcedureItem.ExecutionStatus.COMPLETED
    assert item.completed_at is not None
    assert proc.workflow_status == Procedure.WorkflowStatus.COMPLETED
    assert proc.completed_at is not None

    item.mark_billed()
    item.refresh_from_db()
    proc.refresh_from_db()

    assert item.billed is True
    assert item.billed_at is not None
    assert proc.billing_status == Procedure.BillingStatus.BILLED
    assert proc.billed_at is not None


@pytest.mark.django_db
def test_procedure_item_not_completed_blocks_new_billing():
    tenant = _tenant()
    patient = _patient(tenant)
    proc = Procedure.objects.create(patient=patient)
    item = ProcedureItem.objects.create(
        procedure=proc,
        tenant=tenant,
        description="Curativo não concluído",
        quantity=1,
        unit_price=Decimal("10.00"),
    )

    item.mark_executed()
    item.mark_not_completed()

    item.refresh_from_db()
    proc.refresh_from_db()

    assert item.execution_status == ProcedureItem.ExecutionStatus.NOT_COMPLETED
    assert item.performed is False
    assert proc.workflow_status == Procedure.WorkflowStatus.NOT_COMPLETED

    with pytest.raises(ValidationError) as exc:
        item.mark_billed()

    assert "não pode mais ser faturado" in str(exc.value).lower()
    item.refresh_from_db()
    assert item.billed is False


@pytest.mark.django_db
def test_nursing_api_uses_english_resource_routes(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)

    from api.v1.nursing.filters import FILTER_MAP
    from api.v1.nursing.serializers import SERIALIZER_MAP
    from api.v1.nursing.viewsets import VIEWSET_MAP

    expected = {
        "nursing_evolution",
        "procedure_catalog",
        "procedure_catalog_material",
        "procedure",
        "procedure_item",
        "procedure_item_value",
        "procedure_material",
        "procedure_material_value",
        "nursing_prescription",
        "nursing_record",
        "nursing_vital_sign",
        "ward",
        "ward_bed",
        "ward_admission",
        "ward_dashboard",
    }
    legacy = {
        "evolucaoenfermagem",
        "procedimentocatalogo",
        "procedimentocatalogomaterial",
        "procedimentoitem",
        "procedimentoitemvalor",
        "procedimentomaterial",
        "procedimentomaterialvalor",
        "prescricaoenfermagem",
        "registroenfermagem",
        "sinalvitalenfermagem",
        "camaenfermaria",
        "internamentoenfermaria",
        "enfermariadashboard",
    }
    serializer_expected = expected - {"ward_dashboard"}

    assert set(VIEWSET_MAP) == expected
    assert set(SERIALIZER_MAP) == serializer_expected
    assert set(FILTER_MAP) == serializer_expected
    assert not (set(VIEWSET_MAP) & legacy)

    assert api_client.get("/api/v1/nursing/procedure_item/").status_code == 200
    assert api_client.get("/api/v1/nursing/procedimentoitem/").status_code == 404


@pytest.mark.django_db
def test_ward_dashboard_contract_uses_english_payload(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    _authenticate_admin(tenant, api_client)
    ward = Ward.objects.create(tenant=tenant, name="Ward A")
    bed = WardBed.objects.create(tenant=tenant, ward=ward, number="A1")
    WardAdmission.objects.create(
        tenant=tenant,
        bed=bed,
        patient=patient,
        next_medication_at=timezone.now() + timedelta(hours=2),
        next_medication_description="Analgesic",
    )

    response = api_client.get("/api/v1/nursing/ward_dashboard/")

    assert response.status_code == 200
    assert set(response.data) == {"summary", "beds"}
    assert "resumo" not in response.data
    assert "camas" not in response.data
    assert set(response.data["summary"]) == {"patients", "total_beds", "occupied_beds", "available_beds"}
    assert "pacientes" not in response.data["summary"]

    bed_payload = response.data["beds"][0]
    assert "patient_name" in bed_payload
    assert "bed_number" in bed_payload
    assert "next_medication_description" in bed_payload
    assert "paciente_nome" not in bed_payload
    assert "cama_numero" not in bed_payload
    assert "proxima_medicacao_descricao" not in bed_payload


@pytest.mark.django_db
def test_procedure_item_actions_exposed_in_api(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    _authenticate_admin(tenant, api_client)
    proc = Procedure.objects.create(patient=patient)
    item = ProcedureItem.objects.create(
        procedure=proc,
        tenant=tenant,
        description="Curativo API",
        quantity=1,
        unit_price=Decimal("8.00"),
    )

    base_url = f"/api/v1/nursing/procedure_item/{item.id}/"

    resp_execute = api_client.post(f"{base_url}execute/")
    assert resp_execute.status_code == 200
    assert resp_execute.data["execution_status"] == ProcedureItem.ExecutionStatus.EXECUTED

    resp_complete = api_client.post(f"{base_url}complete/")
    assert resp_complete.status_code == 200
    assert resp_complete.data["execution_status"] == ProcedureItem.ExecutionStatus.COMPLETED

    resp_billed = api_client.post(f"{base_url}mark-billed/")
    assert resp_billed.status_code == 200
    assert resp_billed.data["billed"] is True

    proc.refresh_from_db()
    assert proc.workflow_status == Procedure.WorkflowStatus.COMPLETED
    assert proc.billing_status == Procedure.BillingStatus.BILLED


@pytest.mark.django_db
def test_procedure_item_api_rejects_invalid_transition(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    _authenticate_admin(tenant, api_client)
    proc = Procedure.objects.create(patient=patient)
    item = ProcedureItem.objects.create(
        procedure=proc,
        tenant=tenant,
        description="Curativo inválido",
        quantity=1,
        unit_price=Decimal("8.00"),
    )

    base_url = f"/api/v1/nursing/procedure_item/{item.id}/"

    response = api_client.post(f"{base_url}complete/")
    assert response.status_code == 400
    detail = str(response.data.get("detail", ""))
    assert "execution_status" in detail


@pytest.mark.django_db
def test_procedure_pdf_endpoint_returns_pdf(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    _authenticate_admin(tenant, api_client)
    professional = _professional(tenant)

    procedure = Procedure.objects.create(
        patient=patient,
        notes="Paciente estável após procedimento.",
    )
    procedure.professional.add(professional)

    item = ProcedureItem.objects.create(
        procedure=procedure,
        tenant=tenant,
        description="Curativo compressivo",
        quantity=1,
        unit_price=Decimal("25.00"),
    )

    medication_category = ProductCategory.objects.create(
        tenant=tenant,
        name="Medicamentos",
        description="",
    )
    medication = Product.objects.create(
        tenant=tenant,
        name="Amoxicilina 500mg",
        type=Product.ProductType.MEDICAMENTO,
        sale_price=Decimal("12.00"),
        category=medication_category,
    )
    medication_lot = Lot.objects.create(
        tenant=tenant,
        product=medication,
        lot_number="LMED-001",
        expiration_date=timezone.localdate() + timedelta(days=120),
        initial_quantity=20,
        sale_price=medication.sale_price,
    )

    ProcedureMaterial.objects.create(
        tenant=tenant,
        procedure=procedure,
        procedure_item=item,
        product=medication,
        lot=medication_lot,
        quantity=2,
        unit_cost=Decimal("12.00"),
    )

    invoice = Invoice.objects.create(
        tenant=tenant,
        origin=Invoice.Origin.NURSING,
        patient=patient,
        procedure=procedure,
    )
    invoice.procedures.add(procedure)
    invoice.sync_items_from_origin()
    invoice.status = Invoice.Status.ISSUED
    invoice.save(update_fields=["status"])

    Payment.objects.create(
        tenant=tenant,
        invoice=invoice,
        value=invoice.total_a_pagar,
        change_amount=Decimal("0.00"),
        method=Payment.Method.CASH,
        status=Payment.Status.CONFIRMED,
    )

    response = api_client.get(f"/api/v1/nursing/procedure/{procedure.id}/pdf/")
    assert response.status_code == 200
    assert "application/pdf" in response["Content-Type"]
    assert len(response.content) > 0
