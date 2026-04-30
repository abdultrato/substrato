from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
import pytest

from apps.bloodbank.models import BloodDonation, BloodStockMovement, BloodStorage, BloodUnit
from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(
        identifier="tn-bloodbank",
        name="Tenant Bloodbank",
        domain="tenant-bloodbank.local",
        active=True,
    )


def _patient(tenant: Tenant, name: str, blood_type: str = "O+"):
    return Patient.objects.create(
        tenant=tenant,
        name=name,
        gender="Masculino",
        address_street="Rua Teste",
        birth_date=timezone.localdate() - timedelta(days=30 * 365),
        blood_type=blood_type,
    )


def _authenticate_admin(tenant: Tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin_bloodbank",
        email="admin-bloodbank@example.com",
        password="testpass123",
        tenant=tenant,
    )
    user.is_staff = True
    user.save(update_fields=["is_staff"])

    admin_group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(admin_group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


def _create_completed_donation(*, tenant: Tenant, donor: Patient, replacement_for: Patient | None = None, positive=False):
    test_result = BloodDonation.TestResult.POSITIVE if positive else BloodDonation.TestResult.NEGATIVE
    screening_status = (
        BloodDonation.ScreeningStatus.REJECTED if positive else BloodDonation.ScreeningStatus.APPROVED
    )
    donation = BloodDonation.objects.create(
        tenant=tenant,
        donor=donor,
        donor_role=(
            BloodDonation.DonorRole.REPLACEMENT if replacement_for is not None else BloodDonation.DonorRole.VOLUNTARY
        ),
        replacement_for=replacement_for,
        bag_identifier=f"BAG-{timezone.now().timestamp()}",
        blood_type=BloodDonation._meta.get_field("blood_type").choices[0][0],
        donation_type=BloodDonation.DonationType.WHOLE_BLOOD,
        status=BloodDonation.DonationStatus.COMPLETED,
        screening_status=screening_status,
        collected_at=timezone.now(),
        processed_at=timezone.now(),
        volume_ml=450,
        donor_weight_kg=70,
        hemoglobin_g_dl=13,
        hiv_test=test_result,
        syphilis_rpr_test=test_result,
        hepatitis_b_hbsag_test=test_result,
        hepatitis_c_anti_hcv_test=test_result,
        malaria_test=test_result,
    )
    return donation


@pytest.mark.django_db
def test_blood_donation_rules_for_voluntary_and_replacement():
    tenant = _tenant()
    donor = _patient(tenant, "Doador A")
    replacement_patient = _patient(tenant, "Paciente Reposição")

    with pytest.raises(DjangoValidationError) as voluntary_exc:
        BloodDonation.objects.create(
            tenant=tenant,
            donor=donor,
            donor_role=BloodDonation.DonorRole.VOLUNTARY,
            replacement_for=replacement_patient,
            bag_identifier="BAG-VOL-001",
            collected_at=timezone.now(),
            volume_ml=450,
        )
    assert "replacement_for" in voluntary_exc.value.message_dict

    with pytest.raises(DjangoValidationError) as replacement_exc:
        BloodDonation.objects.create(
            tenant=tenant,
            donor=donor,
            donor_role=BloodDonation.DonorRole.REPLACEMENT,
            bag_identifier="BAG-REP-001",
            collected_at=timezone.now(),
            volume_ml=450,
        )
    assert "replacement_for" in replacement_exc.value.message_dict


@pytest.mark.django_db
def test_completed_donation_generates_unit_and_positive_serology_keeps_quarantine():
    tenant = _tenant()
    donor = _patient(tenant, "Doador B")
    BloodStorage.objects.create(tenant=tenant, name="Frio Central", location="Banco de Sangue")

    donation = _create_completed_donation(tenant=tenant, donor=donor, positive=True)
    unit = BloodUnit.objects.get(tenant=tenant, donation=donation)

    assert unit.status == BloodUnit.UnitStatus.QUARANTINE
    assert BloodStockMovement.objects.filter(
        tenant=tenant,
        unit=unit,
        movement_type=BloodStockMovement.MovementType.INBOUND,
    ).exists()


@pytest.mark.django_db
def test_unit_forward_and_return_flow_updates_stock_movement(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)
    donor = _patient(tenant, "Doador C")
    BloodStorage.objects.create(tenant=tenant, name="Frio 1", location="Banco de Sangue")
    donation = _create_completed_donation(tenant=tenant, donor=donor, positive=False)
    unit = BloodUnit.objects.get(tenant=tenant, donation=donation)

    forward_response = api_client.post(
        f"/api/v1/bloodbank/unidade/{unit.id}/aviar/",
        {"sector": "Enfermaria Geral", "notes": "Enviar para avaliação transfusional"},
        format="json",
    )
    assert forward_response.status_code == 200

    unit.refresh_from_db()
    assert unit.status == BloodUnit.UnitStatus.FORWARDED
    assert unit.forwarded_to_sector == "Enfermaria Geral"

    outcome_response = api_client.post(
        f"/api/v1/bloodbank/unidade/{unit.id}/registrar_desfecho_aviacao/",
        {"outcome": BloodUnit.DispatchOutcome.RETURNED, "notes": "Paciente estabilizado"},
        format="json",
    )
    assert outcome_response.status_code == 200

    unit.refresh_from_db()
    assert unit.status == BloodUnit.UnitStatus.AVAILABLE
    assert unit.dispatch_outcome == BloodUnit.DispatchOutcome.RETURNED

    assert BloodStockMovement.objects.filter(
        tenant=tenant,
        unit=unit,
        movement_type=BloodStockMovement.MovementType.FORWARD,
    ).exists()
    assert BloodStockMovement.objects.filter(
        tenant=tenant,
        unit=unit,
        movement_type=BloodStockMovement.MovementType.RETURN,
    ).exists()


@pytest.mark.django_db
def test_transfused_unit_cannot_change_status_and_manual_stock_adjustment_is_blocked(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)
    donor = _patient(tenant, "Doador D")
    recipient = _patient(tenant, "Paciente D")
    BloodStorage.objects.create(tenant=tenant, name="Frio 2", location="Banco de Sangue")
    donation = _create_completed_donation(tenant=tenant, donor=donor, positive=False)
    unit = BloodUnit.objects.get(tenant=tenant, donation=donation)

    forward_response = api_client.post(
        f"/api/v1/bloodbank/unidade/{unit.id}/aviar/",
        {"sector": "Enfermaria 2"},
        format="json",
    )
    assert forward_response.status_code == 200

    transfuse_response = api_client.post(
        f"/api/v1/bloodbank/unidade/{unit.id}/registrar_desfecho_aviacao/",
        {
            "outcome": BloodUnit.DispatchOutcome.TRANSFUSED,
            "recipient": recipient.id,
            "indication": "Hemorragia aguda",
        },
        format="json",
    )
    assert transfuse_response.status_code == 200

    unit.refresh_from_db()
    assert unit.status == BloodUnit.UnitStatus.TRANSFUSED

    unit.status = BloodUnit.UnitStatus.AVAILABLE
    with pytest.raises(DjangoValidationError):
        unit.save()

    movement_response = api_client.post(
        "/api/v1/bloodbank/movimentoestoque/",
        {
            "unit": unit.id,
            "movement_type": BloodStockMovement.MovementType.ADJUSTMENT,
            "reason": "Ajuste manual indevido",
        },
        format="json",
    )
    assert movement_response.status_code == 405


@pytest.mark.django_db
def test_blood_storage_api_is_read_only(api_client):
    tenant = _tenant()
    _authenticate_admin(tenant, api_client)
    storage = BloodStorage.objects.create(
        tenant=tenant,
        name="Storage RO",
        location="Banco de Sangue",
    )

    list_response = api_client.get("/api/v1/bloodbank/armazenamento/")
    assert list_response.status_code == 200

    create_response = api_client.post(
        "/api/v1/bloodbank/armazenamento/",
        {"name": "Novo Storage", "location": "Bloco 2"},
        format="json",
    )
    assert create_response.status_code == 405

    patch_response = api_client.patch(
        f"/api/v1/bloodbank/armazenamento/{storage.id}/",
        {"location": "Alterado"},
        format="json",
    )
    assert patch_response.status_code == 405

    delete_response = api_client.delete(f"/api/v1/bloodbank/armazenamento/{storage.id}/")
    assert delete_response.status_code == 405
