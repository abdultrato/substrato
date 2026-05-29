import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.human_resources.models.employee import Employee
from apps.public_health.models import (
    AdverseEventFollowingImmunization,
    ImmunizationRecord,
    PublicHealthNotification,
    VaccinationCampaign,
    VaccinationCampaignTarget,
    VaccineLot,
    VaccineProduct,
)
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


def _tenant(identifier="tn-public-health", domain="tenant-public-health.local"):
    return Tenant.objects.create(
        identifier=identifier,
        name="Tenant Saúde Pública",
        domain=domain,
        active=True,
    )


def _patient(tenant, name="Paciente Imunização"):
    return Patient.objects.create(
        tenant=tenant,
        name=name,
        gender="Feminino",
        address_street="Rua das Vacinas",
    )


def _employee(tenant, name="Enfermeiro Vacinação"):
    return Employee.objects.create(
        tenant=tenant,
        name=name,
        document_number=f"DOC-{name.replace(' ', '-').upper()}",
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin-public-health",
        email="admin-public-health@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_public_health_models_cover_stock_boosters_campaign_targets_aefi_and_notifications():
    tenant = _tenant()
    patient = _patient(tenant)
    professional = _employee(tenant)

    vaccine = VaccineProduct.objects.create(
        tenant=tenant,
        name="Vacina COVID-19 Bivalente",
        code="COVID-BI",
        disease="COVID-19",
        booster_interval_days=180,
        dose_count_required=2,
        official_code="VAC-COVID-BI",
    )
    lot = VaccineLot.objects.create(
        tenant=tenant,
        vaccine=vaccine,
        lot_number="LOT-COVID-001",
        status=VaccineLot.Status.ACTIVE,
        expiration_date=timezone.localdate() + timezone.timedelta(days=365),
        doses_received=10,
        storage_temperature_c="5.00",
    )
    campaign = VaccinationCampaign.objects.create(
        tenant=tenant,
        name="Campanha COVID 2026",
        vaccine=vaccine,
        manager=professional,
        campaign_type=VaccinationCampaign.CampaignType.MASS,
        status=VaccinationCampaign.Status.ACTIVE,
        target_region="Cabo Delgado",
        target_population=100,
        target_doses=5,
        official_program_code="E-SUS-COVID-2026",
        official_system="E_SUS",
    )
    target = VaccinationCampaignTarget.objects.create(
        tenant=tenant,
        campaign=campaign,
        region="Cabo Delgado",
        district="Pemba",
        target_population=50,
        target_doses=5,
    )
    record = ImmunizationRecord.objects.create(
        patient=patient,
        lot=lot,
        campaign=campaign,
        target_group=target,
        administered_by=professional,
        status=ImmunizationRecord.Status.ADMINISTERED,
        source=ImmunizationRecord.Source.CAMPAIGN,
        dose_number=1,
    )

    lot.refresh_from_db()
    target.refresh_from_db()
    assert record.tenant == tenant
    assert record.vaccine == vaccine
    assert record.next_due_date == record.administered_at.date() + timezone.timedelta(days=180)
    assert lot.doses_available == 9
    assert target.administered_doses == 1
    assert campaign.administered_doses == 1

    notification = PublicHealthNotification.objects.create(
        official_system=PublicHealthNotification.OfficialSystem.E_SUS,
        event_type=PublicHealthNotification.EventType.IMMUNIZATION,
        status=PublicHealthNotification.Status.ACCEPTED,
        immunization_record=record,
        external_reference="E-SUS-IMM-001",
        payload={"dose": 1},
        response_payload={"accepted": True},
    )
    assert notification.tenant == tenant
    assert notification.sent_at is not None
    assert notification.attempt_count == 1

    adverse_event = AdverseEventFollowingImmunization.objects.create(
        immunization_record=record,
        reported_by=professional,
        severity=AdverseEventFollowingImmunization.Severity.SEVERE,
        status=AdverseEventFollowingImmunization.Status.UNDER_INVESTIGATION,
        onset_at=timezone.now() - timezone.timedelta(hours=2),
        symptoms="Febre alta e reação local importante.",
    )
    assert adverse_event.patient == patient
    assert adverse_event.vaccine == vaccine
    assert adverse_event.lot == lot
    assert adverse_event.serious is True
    assert adverse_event.investigation_due_at is not None

    aefi_notification = PublicHealthNotification.objects.create(
        official_system=PublicHealthNotification.OfficialSystem.SIPNI,
        event_type=PublicHealthNotification.EventType.AEFI,
        status=PublicHealthNotification.Status.PENDING,
        adverse_event=adverse_event,
        payload={"severity": "SEVERE"},
    )
    assert aefi_notification.tenant == tenant

    other_vaccine = VaccineProduct.objects.create(
        tenant=tenant,
        name="Vacina HPV",
        code="HPV-01",
        disease="HPV",
    )
    with pytest.raises(ValidationError):
        ImmunizationRecord.objects.create(
            patient=patient,
            vaccine=other_vaccine,
            lot=lot,
            status=ImmunizationRecord.Status.ADMINISTERED,
            dose_number=1,
        )


@pytest.mark.django_db
def test_public_health_api_exposes_vaccines_lots_campaigns_immunizations_aefi_and_notifications(api_client):
    tenant = _tenant(identifier="tn-public-health-api", domain="tenant-public-health-api.local")
    patient = _patient(tenant, name="Paciente API Imunização")
    professional = _employee(tenant, name="Enfermeiro API Vacinação")
    _authenticate_admin(tenant, api_client)

    vaccine_response = api_client.post(
        "/api/v1/public_health/vaccine/",
        {
            "name": "Vacina Influenza 2026",
            "code": "FLU-2026",
            "disease": "Influenza",
            "vaccine_type": "INACTIVATED",
            "dose_count_required": 1,
            "booster_interval_days": 365,
            "official_code": "VAC-FLU-2026",
        },
        format="json",
    )
    assert vaccine_response.status_code == 201
    vaccine_payload = _response_data(vaccine_response)

    lot_response = api_client.post(
        "/api/v1/public_health/lot/",
        {
            "vaccine": vaccine_payload["id"],
            "lot_number": "LOT-FLU-API-001",
            "status": "ACTIVE",
            "expiration_date": (timezone.localdate() + timezone.timedelta(days=300)).isoformat(),
            "doses_received": 20,
            "storage_temperature_c": "4.00",
        },
        format="json",
    )
    assert lot_response.status_code == 201
    lot_payload = _response_data(lot_response)
    assert lot_payload["doses_available"] == 20

    campaign_response = api_client.post(
        "/api/v1/public_health/campaign/",
        {
            "name": "Campanha Influenza Pemba",
            "vaccine": vaccine_payload["id"],
            "manager": professional.id,
            "campaign_type": "MASS",
            "status": "ACTIVE",
            "target_region": "Pemba",
            "target_population": 1000,
            "target_doses": 100,
            "official_program_code": "FLU-PEMBA-2026",
            "official_system": "E_SUS",
        },
        format="json",
    )
    assert campaign_response.status_code == 201
    campaign_payload = _response_data(campaign_response)

    target_response = api_client.post(
        "/api/v1/public_health/target/",
        {
            "campaign": campaign_payload["id"],
            "region": "Pemba",
            "district": "Cariaco",
            "target_population": 250,
            "target_doses": 100,
        },
        format="json",
    )
    assert target_response.status_code == 201
    target_payload = _response_data(target_response)

    immunization_response = api_client.post(
        "/api/v1/public_health/immunization/",
        {
            "patient": patient.id,
            "lot": lot_payload["id"],
            "campaign": campaign_payload["id"],
            "target_group": target_payload["id"],
            "administered_by": professional.id,
            "status": "ADMINISTERED",
            "source": "CAMPAIGN",
            "dose_number": 1,
            "route": "IM",
            "consent_confirmed": True,
        },
        format="json",
    )
    assert immunization_response.status_code == 201
    immunization_payload = _response_data(immunization_response)
    assert immunization_payload["patient"] == patient.id
    assert immunization_payload["vaccine"] == vaccine_payload["id"]
    assert immunization_payload["next_due_date"] is not None

    adverse_event_response = api_client.post(
        "/api/v1/public_health/adverse_event/",
        {
            "immunization_record": immunization_payload["id"],
            "reported_by": professional.id,
            "severity": "SEVERE",
            "status": "UNDER_INVESTIGATION",
            "onset_at": (timezone.now() - timezone.timedelta(hours=1)).isoformat(),
            "symptoms": "Febre alta após vacinação.",
        },
        format="json",
    )
    assert adverse_event_response.status_code == 201
    adverse_event_payload = _response_data(adverse_event_response)
    assert adverse_event_payload["patient"] == patient.id
    assert adverse_event_payload["serious"] is True

    notification_response = api_client.post(
        "/api/v1/public_health/notification/",
        {
            "official_system": "E_SUS",
            "event_type": "IMMUNIZATION",
            "status": "SENT",
            "immunization_record": immunization_payload["id"],
            "external_reference": "E-SUS-FLU-001",
            "payload": {"campaign": "FLU-PEMBA-2026"},
        },
        format="json",
    )
    assert notification_response.status_code == 201
    notification_payload = _response_data(notification_response)
    assert notification_payload["sent_at"] is not None
    assert notification_payload["attempt_count"] == 1

    pending_notification_response = api_client.post(
        "/api/v1/public_health/notification/",
        {
            "official_system": "SIPNI",
            "event_type": "AEFI",
            "status": "PENDING",
            "adverse_event": adverse_event_payload["id"],
            "external_reference": "SIPNI-AEFI-FLU-001",
            "payload": {"severity": "SEVERE"},
        },
        format="json",
    )
    assert pending_notification_response.status_code == 201

    campaign_list_response = api_client.get("/api/v1/public_health/campaign/?status=ACTIVE")
    assert campaign_list_response.status_code == 200
    assert len(_items(campaign_list_response)) == 1

    adverse_event_list_response = api_client.get("/api/v1/public_health/adverse_event/?serious=true")
    assert adverse_event_list_response.status_code == 200
    assert len(_items(adverse_event_list_response)) == 1

    dashboard_response = api_client.get("/api/v1/public_health/dashboard/")
    assert dashboard_response.status_code == 200
    dashboard_payload = _response_data(dashboard_response)
    assert dashboard_payload["summary"]["vaccines"] == 1
    assert dashboard_payload["summary"]["active_lots"] == 1
    assert dashboard_payload["summary"]["active_campaigns"] == 1
    assert dashboard_payload["summary"]["immunizations_30d"] == 1
    assert dashboard_payload["summary"]["serious_aefi_open"] == 1
    assert dashboard_payload["summary"]["pending_notifications"] == 1
    assert dashboard_payload["campaign_progress"][0]["coverage_percent"] == "1.00"
    assert dashboard_payload["aefi_queue"][0]["id"] == adverse_event_payload["id"]
    assert dashboard_payload["notification_queue"][0]["external_reference"] == "SIPNI-AEFI-FLU-001"
