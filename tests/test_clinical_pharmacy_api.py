from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.clinical_pharmacy.models import (
    AntibioticStewardshipReview,
    ClinicalPharmacyIngredient,
    ClinicalPharmacyIVPreparation,
    ControlledSubstanceMovement,
    DrugInteractionRule,
    MedicationInteractionCheck,
)
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.product import Product
from apps.tenants.models.tenant import Tenant


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _items(response):
    payload = _response_data(response)
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return []


def _tenant():
    return Tenant.objects.create(
        identifier="tn-clinical-pharmacy",
        name="Tenant Farmácia Clínica",
        domain="tenant-clinical-pharmacy.local",
        active=True,
    )


def _patient(tenant, name="Paciente Farmácia Clínica"):
    return Patient.objects.create(
        tenant=tenant,
        name=name,
        gender="Feminino",
        address_street="Rua Terapia IV",
    )


def _product(tenant, name):
    return Product.objects.create(
        tenant=tenant,
        name=name,
        type=Product.ProductType.MEDICAMENTO,
    )


def _lot(tenant, product, number, qty=100):
    return Lot.objects.create(
        tenant=tenant,
        product=product,
        lot_number=number,
        expiration_date=timezone.localdate() + timezone.timedelta(days=180),
        initial_quantity=qty,
    )


def _prescription_item(tenant, patient, product, name="Prescrição IV"):
    record = MedicalRecordEntry.objects.create(
        tenant=tenant,
        patient=patient,
        symptoms="Terapia intravenosa",
        diagnosis="Necessita preparo em farmácia clínica",
        prescription=name,
    )
    return PrescriptionItem.objects.create(
        tenant=tenant,
        record=record,
        medication=product,
        dosage_value=Decimal("500.00"),
        dosage_unit="MG",
        dose_count=1,
        notes=name,
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin-clinical-pharmacy",
        email="admin-clinical-pharmacy@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_clinical_pharmacy_models_track_iv_preparation_interactions_and_controlled_lot():
    tenant = _tenant()
    patient = _patient(tenant)
    chemo = _product(tenant, "Cisplatina")
    diluent = _product(tenant, "Soro fisiológico")
    antibiotic = _product(tenant, "Meropenem")
    interacting = _product(tenant, "Varfarina")
    chemo_lot = _lot(tenant, chemo, "CISP-001")
    diluent_lot = _lot(tenant, diluent, "SF-001")
    prescription_item = _prescription_item(tenant, patient, chemo, name="Cisplatina IV")

    preparation = ClinicalPharmacyIVPreparation.objects.create(
        patient=patient,
        prescription_item=prescription_item,
        lot=chemo_lot,
        preparation_type="CHEMOTHERAPY",
        hazardous_drug=True,
        sterility_check_passed=True,
        compatibility_check_passed=True,
        prepared_at=timezone.now(),
        final_volume_ml=Decimal("250.000"),
        diluent="Soro fisiológico",
    )
    ingredient = ClinicalPharmacyIngredient.objects.create(
        preparation=preparation,
        product=diluent,
        lot=diluent_lot,
        role="DILUENT",
        quantity_value=Decimal("250.000"),
        quantity_unit="ML",
    )
    rule = DrugInteractionRule.objects.create(
        tenant=tenant,
        primary_drug=chemo,
        interacting_drug=interacting,
        name="Cisplatina + Varfarina",
        severity="MAJOR",
        recommendation="Monitorizar INR e risco hemorrágico.",
    )
    interaction_check = MedicationInteractionCheck.objects.create(
        patient=patient,
        prescription_item=prescription_item,
        interacting_drug=interacting,
        status="REVIEWED",
    )
    receipt = ControlledSubstanceMovement.objects.create(
        tenant=tenant,
        product=chemo,
        lot=chemo_lot,
        movement_type="RECEIPT",
        schedule="SCHEDULE_II",
        quantity=Decimal("10.000"),
        unit="MG",
        source="Cofre central",
        chain_of_custody_code="CISP-CHAIN-001",
    )
    dispense = ControlledSubstanceMovement.objects.create(
        tenant=tenant,
        product=chemo,
        lot=chemo_lot,
        patient=patient,
        prescription_item=prescription_item,
        preparation=preparation,
        movement_type="DISPENSE",
        schedule="SCHEDULE_II",
        quantity=Decimal("2.000"),
        unit="MG",
        destination="Sala de quimioterapia",
    )
    antibiotic_item = _prescription_item(tenant, patient, antibiotic, name="Meropenem")
    stewardship = AntibioticStewardshipReview.objects.create(
        patient=patient,
        prescription_item=antibiotic_item,
        therapy_type="TARGETED",
        status="APPROVED",
        indication="Pneumonia associada a cuidados de saúde",
        infection_site="Pulmão",
        organism="Klebsiella pneumoniae",
        culture_result="Sensível a meropenem",
        dose_optimized=True,
    )

    preparation.refresh_from_db()
    assert preparation.tenant == tenant
    assert preparation.product == chemo
    assert preparation.status == "PREPARED"
    assert preparation.expires_at is not None
    assert ingredient.tenant == tenant
    assert ingredient.position == 1
    assert interaction_check.rule == rule
    assert interaction_check.severity == "MAJOR"
    assert interaction_check.recommendation == rule.recommendation
    assert receipt.running_balance == Decimal("10.000")
    assert dispense.running_balance == Decimal("8.000")
    assert stewardship.tenant == tenant
    assert stewardship.antibiotic == antibiotic
    assert stewardship.review_due_date == stewardship.start_date + timezone.timedelta(days=2)

    wrong_lot = _lot(tenant, antibiotic, "ATB-001")
    with pytest.raises(ValidationError):
        ClinicalPharmacyIngredient.objects.create(
            preparation=preparation,
            product=diluent,
            lot=wrong_lot,
            role="ADDITIVE",
            quantity_value=Decimal("1.000"),
            quantity_unit="MG",
        )

    other_patient = _patient(tenant, name="Outro Paciente")
    with pytest.raises(ValidationError):
        ControlledSubstanceMovement.objects.create(
            tenant=tenant,
            product=chemo,
            lot=chemo_lot,
            patient=other_patient,
            prescription_item=prescription_item,
            movement_type="DISPENSE",
            schedule="SCHEDULE_II",
            quantity=Decimal("1.000"),
            unit="MG",
        )

    with pytest.raises(ValidationError):
        DrugInteractionRule.objects.create(
            tenant=tenant,
            primary_drug=chemo,
            interacting_drug=chemo,
            name="Regra inválida",
            severity="MAJOR",
            recommendation="Inválido",
        )


@pytest.mark.django_db
def test_clinical_pharmacy_api_exposes_iv_controlled_interaction_and_stewardship_workflow(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    chemo = _product(tenant, "Doxorrubicina")
    diluent = _product(tenant, "Dextrose 5%")
    antibiotic = _product(tenant, "Vancomicina")
    interacting = _product(tenant, "Gentamicina")
    chemo_lot = _lot(tenant, chemo, "DOXO-001")
    diluent_lot = _lot(tenant, diluent, "DEX-001")
    prescription_item = _prescription_item(tenant, patient, chemo, name="Doxorrubicina IV")
    antibiotic_item = _prescription_item(tenant, patient, antibiotic, name="Vancomicina")
    _authenticate_admin(tenant, api_client)

    preparation_response = api_client.post(
        "/api/v1/clinical_pharmacy/preparation/",
        {
            "patient": patient.id,
            "prescription_item": prescription_item.id,
            "lot": chemo_lot.id,
            "preparation_type": "CHEMOTHERAPY",
            "hazardous_drug": True,
            "sterility_check_passed": True,
            "compatibility_check_passed": True,
            "prepared_at": timezone.now().isoformat(),
            "final_volume_ml": "100.000",
            "diluent": "Dextrose 5%",
        },
        format="json",
    )
    assert preparation_response.status_code == 201
    preparation_payload = _response_data(preparation_response)
    assert preparation_payload["product"] == chemo.id
    assert preparation_payload["status"] == "PREPARED"
    preparation_id = preparation_payload["id"]

    ingredient_response = api_client.post(
        "/api/v1/clinical_pharmacy/ingredient/",
        {
            "preparation": preparation_id,
            "product": diluent.id,
            "lot": diluent_lot.id,
            "role": "DILUENT",
            "quantity_value": "100.000",
            "quantity_unit": "ML",
        },
        format="json",
    )
    assert ingredient_response.status_code == 201

    rule_response = api_client.post(
        "/api/v1/clinical_pharmacy/interaction_rule/",
        {
            "name": "Vancomicina + Gentamicina",
            "primary_drug": antibiotic.id,
            "interacting_drug": interacting.id,
            "severity": "MAJOR",
            "recommendation": "Monitorizar nefrotoxicidade e níveis séricos.",
        },
        format="json",
    )
    assert rule_response.status_code == 201

    interaction_response = api_client.post(
        "/api/v1/clinical_pharmacy/interaction_check/",
        {
            "patient": patient.id,
            "prescription_item": antibiotic_item.id,
            "interacting_drug": interacting.id,
            "status": "REVIEWED",
        },
        format="json",
    )
    assert interaction_response.status_code == 201
    interaction_payload = _response_data(interaction_response)
    assert interaction_payload["primary_drug"] == antibiotic.id
    assert interaction_payload["severity"] == "MAJOR"

    controlled_response = api_client.post(
        "/api/v1/clinical_pharmacy/controlled_movement/",
        {
            "product": chemo.id,
            "lot": chemo_lot.id,
            "patient": patient.id,
            "prescription_item": prescription_item.id,
            "preparation": preparation_id,
            "movement_type": "DISPENSE",
            "schedule": "SCHEDULE_II",
            "quantity": "2.000",
            "unit": "MG",
            "destination": "Sala de terapia IV",
            "chain_of_custody_code": "DOXO-CHAIN-001",
        },
        format="json",
    )
    assert controlled_response.status_code == 201
    assert _response_data(controlled_response)["running_balance"] == "-2.000"

    stewardship_response = api_client.post(
        "/api/v1/clinical_pharmacy/antibiotic_review/",
        {
            "patient": patient.id,
            "prescription_item": antibiotic_item.id,
            "therapy_type": "EMPIRIC",
            "status": "APPROVED",
            "indication": "Sépsis provável",
            "infection_site": "Corrente sanguínea",
            "planned_duration_days": 7,
            "dose_optimized": True,
        },
        format="json",
    )
    assert stewardship_response.status_code == 201
    stewardship_payload = _response_data(stewardship_response)
    assert stewardship_payload["antibiotic"] == antibiotic.id
    assert stewardship_payload["review_due_date"] is not None

    list_response = api_client.get("/api/v1/clinical_pharmacy/preparation/?preparation_type=CHEMOTHERAPY")
    assert list_response.status_code == 200
    assert len(_items(list_response)) == 1

    interaction_list_response = api_client.get("/api/v1/clinical_pharmacy/interaction_check/?severity=MAJOR")
    assert interaction_list_response.status_code == 200
    assert len(_items(interaction_list_response)) == 1
