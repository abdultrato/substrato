from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.human_resources.models.employee import Employee
from apps.telemedicine.models import (
    ChronicMonitoringProgram,
    RemoteClinicalAlert,
    RemoteMonitoringDevice,
    RemoteVitalReading,
    StoreAndForwardCase,
    TelemedicineWaitingRoomEntry,
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


def _tenant():
    return Tenant.objects.create(
        identifier="tn-telemedicine",
        name="Tenant Telemedicina",
        domain="tenant-telemedicine.local",
        active=True,
    )


def _patient(tenant, name="Paciente Telemedicina"):
    return Patient.objects.create(
        tenant=tenant,
        name=name,
        gender="Feminino",
        address_street="Rua Monitoramento",
    )


def _employee(tenant, name="Clínico Telemedicina"):
    return Employee.objects.create(
        tenant=tenant,
        name=name,
        document_number=f"DOC-{name.replace(' ', '-').upper()}",
    )


def _consultation(tenant, patient, doctor, consultation_type=MedicalConsultation.ConsultationType.TELEMEDICINE):
    return MedicalConsultation.objects.create(
        tenant=tenant,
        patient=patient,
        doctor=doctor,
        type="Telemedicina",
        consultation_type=consultation_type,
        scheduled_for=timezone.now() + timezone.timedelta(hours=2),
        price=Decimal("500.00"),
    )


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin-telemedicine",
        email="admin-telemedicine@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_telemedicine_models_cover_virtual_room_remote_vitals_async_case_program_and_alert():
    tenant = _tenant()
    patient = _patient(tenant)
    clinician = _employee(tenant)
    consultation = _consultation(tenant, patient, clinician)
    async_consultation = _consultation(
        tenant,
        patient,
        clinician,
        consultation_type=MedicalConsultation.ConsultationType.ASYNC,
    )

    waiting_entry = TelemedicineWaitingRoomEntry.objects.create(
        consultation=consultation,
        status=TelemedicineWaitingRoomEntry.Status.READY,
        priority=TelemedicineWaitingRoomEntry.Priority.URGENT,
        queue_position=1,
        chief_complaint="Dispneia e tosse",
        preliminary_symptoms="SpO2 baixa em domicílio",
        device_check_passed=True,
        consent_confirmed=True,
        video_room_url="https://telemedicina.example.com/sala/abc",
    )
    device = RemoteMonitoringDevice.objects.create(
        patient=patient,
        device_type=RemoteMonitoringDevice.DeviceType.PULSE_OXIMETER,
        status=RemoteMonitoringDevice.Status.ACTIVE,
        serial_number="OXI-001",
        external_device_id="EXT-OXI-001",
        paired_at=timezone.now(),
        battery_percent=Decimal("87.50"),
    )
    reading = RemoteVitalReading.objects.create(
        device=device,
        systolic_bp=185,
        diastolic_bp=121,
        spo2_percent=Decimal("88.00"),
        heart_rate_bpm=118,
        raw_payload={"source": "wearable"},
    )
    program = ChronicMonitoringProgram.objects.create(
        patient=patient,
        care_manager=clinician,
        condition=ChronicMonitoringProgram.Condition.HYPERTENSION,
        status=ChronicMonitoringProgram.Status.ACTIVE,
        start_date=timezone.localdate(),
        review_frequency_days=14,
        target_systolic_max=140,
        target_diastolic_max=90,
        target_spo2_min=Decimal("92.00"),
        care_plan="Monitorar PA e SpO2 duas vezes ao dia.",
    )
    alert = RemoteClinicalAlert.objects.create(
        program=program,
        reading=reading,
        alert_type=RemoteClinicalAlert.AlertType.VITAL_THRESHOLD,
        severity=RemoteClinicalAlert.Severity.CRITICAL,
        status=RemoteClinicalAlert.Status.ACKNOWLEDGED,
        acknowledged_by=clinician,
        message="PA e SpO2 fora dos limites.",
        recommended_action="Contactar paciente e orientar ida ao serviço.",
    )
    async_case = StoreAndForwardCase.objects.create(
        consultation=async_consultation,
        requested_by=clinician,
        reviewer=clinician,
        specialty_area=StoreAndForwardCase.SpecialtyArea.DERMATOLOGY,
        status=StoreAndForwardCase.Status.COMPLETED,
        reviewed_at=timezone.now(),
        title="Lesão cutânea assíncrona",
        clinical_question="Avaliar lesão pigmentada.",
        clinical_summary="Paciente enviou imagens seriadas.",
        media_manifest=[{"type": "image", "url": "https://example.com/lesao.jpg"}],
        findings="Lesão com assimetria.",
        recommendation="Encaminhar para consulta presencial.",
    )

    device.refresh_from_db()
    assert waiting_entry.tenant == tenant
    assert waiting_entry.patient == patient
    assert waiting_entry.clinician == clinician
    assert reading.tenant == tenant
    assert reading.patient == patient
    assert reading.has_critical_value is True
    assert device.last_sync_at == reading.received_at
    assert program.next_review_date == program.start_date + timezone.timedelta(days=14)
    assert alert.patient == patient
    assert alert.device == device
    assert alert.acknowledged_at is not None
    assert async_case.patient == patient

    in_person_consultation = _consultation(
        tenant,
        patient,
        clinician,
        consultation_type=MedicalConsultation.ConsultationType.IN_PERSON,
    )
    with pytest.raises(ValidationError):
        TelemedicineWaitingRoomEntry.objects.create(
            consultation=in_person_consultation,
            device_check_passed=True,
            consent_confirmed=True,
        )

    with pytest.raises(ValidationError):
        RemoteVitalReading.objects.create(
            patient=patient,
            systolic_bp=160,
        )


@pytest.mark.django_db
def test_telemedicine_api_exposes_waiting_room_devices_readings_programs_async_cases_and_alerts(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    clinician = _employee(tenant)
    consultation = _consultation(tenant, patient, clinician)
    async_consultation = _consultation(
        tenant,
        patient,
        clinician,
        consultation_type=MedicalConsultation.ConsultationType.ASYNC,
    )
    _authenticate_admin(tenant, api_client)

    waiting_response = api_client.post(
        "/api/v1/telemedicine/waiting_room/",
        {
            "consultation": consultation.id,
            "status": "READY",
            "priority": "URGENT",
            "queue_position": 1,
            "chief_complaint": "Dispneia",
            "preliminary_symptoms": "SpO2 baixa",
            "device_check_passed": True,
            "consent_confirmed": True,
            "video_room_url": "https://telemedicina.example.com/sala/api",
        },
        format="json",
    )
    assert waiting_response.status_code == 201
    waiting_payload = _response_data(waiting_response)
    assert waiting_payload["patient"] == patient.id
    assert waiting_payload["clinician"] == clinician.id

    device_response = api_client.post(
        "/api/v1/telemedicine/device/",
        {
            "patient": patient.id,
            "device_type": "BLOOD_PRESSURE",
            "status": "ACTIVE",
            "serial_number": "BP-API-001",
            "external_device_id": "EXT-BP-001",
            "paired_at": timezone.now().isoformat(),
            "battery_percent": "90.00",
        },
        format="json",
    )
    assert device_response.status_code == 201
    device_payload = _response_data(device_response)

    vital_response = api_client.post(
        "/api/v1/telemedicine/vital_reading/",
        {
            "device": device_payload["id"],
            "systolic_bp": 182,
            "diastolic_bp": 122,
            "spo2_percent": "89.00",
            "heart_rate_bpm": 112,
            "raw_payload": {"integration": "wearable"},
        },
        format="json",
    )
    assert vital_response.status_code == 201
    vital_payload = _response_data(vital_response)
    assert vital_payload["patient"] == patient.id
    assert vital_payload["has_critical_value"] is True

    program_response = api_client.post(
        "/api/v1/telemedicine/program/",
        {
            "patient": patient.id,
            "care_manager": clinician.id,
            "condition": "HYPERTENSION",
            "status": "ACTIVE",
            "review_frequency_days": 14,
            "target_systolic_max": 140,
            "target_diastolic_max": 90,
            "care_plan": "Monitorar pressão arterial diariamente.",
        },
        format="json",
    )
    assert program_response.status_code == 201
    program_payload = _response_data(program_response)
    assert program_payload["next_review_date"] is not None

    alert_response = api_client.post(
        "/api/v1/telemedicine/alert/",
        {
            "program": program_payload["id"],
            "reading": vital_payload["id"],
            "alert_type": "VITAL_THRESHOLD",
            "severity": "CRITICAL",
            "status": "ACKNOWLEDGED",
            "acknowledged_by": clinician.id,
            "message": "Pressão arterial crítica.",
            "recommended_action": "Ligar ao paciente e escalar para médico.",
        },
        format="json",
    )
    assert alert_response.status_code == 201
    alert_payload = _response_data(alert_response)
    assert alert_payload["patient"] == patient.id
    assert alert_payload["device"] == device_payload["id"]
    assert alert_payload["acknowledged_at"] is not None

    async_response = api_client.post(
        "/api/v1/telemedicine/async_case/",
        {
            "consultation": async_consultation.id,
            "requested_by": clinician.id,
            "reviewer": clinician.id,
            "specialty_area": "RADIOLOGY",
            "status": "COMPLETED",
            "reviewed_at": timezone.now().isoformat(),
            "title": "Revisão remota de imagem",
            "clinical_question": "Avaliar achado radiológico.",
            "media_manifest": [{"type": "dicom", "study_uid": "1.2.3"}],
            "findings": "Sem sinais de urgência.",
            "recommendation": "Manter seguimento ambulatorial.",
        },
        format="json",
    )
    assert async_response.status_code == 201
    async_payload = _response_data(async_response)
    assert async_payload["patient"] == patient.id

    list_response = api_client.get("/api/v1/telemedicine/alert/?severity=CRITICAL")
    assert list_response.status_code == 200
    assert len(_items(list_response)) == 1

    waiting_list_response = api_client.get("/api/v1/telemedicine/waiting_room/?status=READY")
    assert waiting_list_response.status_code == 200
    assert len(_items(waiting_list_response)) == 1


@pytest.mark.django_db
def test_telemedicine_workflow_actions_are_routed(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    clinician = _employee(tenant)
    _authenticate_admin(tenant, api_client)

    # Sala virtual: ciclo triagem → pronto → chamada → conclusão.
    entry = TelemedicineWaitingRoomEntry.objects.create(
        tenant=tenant,
        patient=patient,
        status=TelemedicineWaitingRoomEntry.Status.CHECKED_IN,
        chief_complaint="Cefaleia",
    )
    triage_response = api_client.post(f"/api/v1/telemedicine/waiting_room/{entry.id}/iniciar-triagem/")
    assert triage_response.status_code == 200
    assert _response_data(triage_response)["status"] == "TRIAGE"

    ready_response = api_client.post(
        f"/api/v1/telemedicine/waiting_room/{entry.id}/marcar-pronto/",
        {"device_check_passed": True, "consent_confirmed": True},
        format="json",
    )
    assert ready_response.status_code == 200
    assert _response_data(ready_response)["status"] == "READY"

    call_response = api_client.post(
        f"/api/v1/telemedicine/waiting_room/{entry.id}/iniciar-chamada/",
        {"clinician": clinician.id},
        format="json",
    )
    assert call_response.status_code == 200
    assert _response_data(call_response)["status"] == "IN_CALL"

    complete_response = api_client.post(f"/api/v1/telemedicine/waiting_room/{entry.id}/concluir/")
    assert complete_response.status_code == 200
    assert _response_data(complete_response)["status"] == "COMPLETED"

    # Leitura crítica → gerar alerta acionável.
    device = RemoteMonitoringDevice.objects.create(
        tenant=tenant,
        patient=patient,
        device_type=RemoteMonitoringDevice.DeviceType.BLOOD_PRESSURE,
        status=RemoteMonitoringDevice.Status.ACTIVE,
        paired_at=timezone.now(),
        serial_number="BP-ROUTE-1",
    )
    reading = RemoteVitalReading.objects.create(
        tenant=tenant,
        patient=patient,
        device=device,
        systolic_bp=188,
        diastolic_bp=124,
    )
    alert_response = api_client.post(
        f"/api/v1/telemedicine/vital_reading/{reading.id}/gerar-alerta/",
        {"recommended_action": "Contactar paciente"},
        format="json",
    )
    assert alert_response.status_code == 201
    alert_id = _response_data(alert_response)["id"]

    ack_response = api_client.post(
        f"/api/v1/telemedicine/alert/{alert_id}/reconhecer/",
        {"actor": clinician.id},
        format="json",
    )
    assert ack_response.status_code == 200
    assert _response_data(ack_response)["status"] == "ACKNOWLEDGED"

    resolve_response = api_client.post(
        f"/api/v1/telemedicine/alert/{alert_id}/resolver/",
        {"actor": clinician.id, "action_taken": "Paciente orientado a ir ao serviço"},
        format="json",
    )
    assert resolve_response.status_code == 200
    assert _response_data(resolve_response)["status"] == "RESOLVED"
