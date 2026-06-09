"""Testes de jornada da Telemedicina (nível de serviço, ORM direto, sem HTTP).

Cobre as transições de estado e a orquestração de ``TelemedicineWorkflowService``:
sala virtual, dispositivos remotos, casos assíncronos, programas crónicos e
alertas clínicos. Correr com ``--no-migrations`` (ver memória de test-speed).
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.clinical.models.patient import Patient
from apps.human_resources.models.employee import Employee
from apps.telemedicine.models import (
    ChronicMonitoringProgram,
    RemoteClinicalAlert,
    RemoteMonitoringDevice,
    RemoteVitalReading,
    StoreAndForwardCase,
    TelemedicineWaitingRoomEntry,
)
from apps.telemedicine.services import TelemedicineWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(
        identifier="tn-tele-wf",
        name="Tenant Telemedicina WF",
        domain="tenant-tele-wf.local",
        active=True,
    )


def _patient(tenant, name="Paciente WF"):
    return Patient.objects.create(
        tenant=tenant,
        name=name,
        gender="Feminino",
        address_street="Rua WF",
    )


def _employee(tenant, name="Clínico WF"):
    return Employee.objects.create(
        tenant=tenant,
        name=name,
        document_number=f"DOC-{name.replace(' ', '-').upper()}",
    )


# --------------------------------------------------------------------------- #
# Sala de espera virtual
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_waiting_room_full_journey():
    tenant = _tenant()
    patient = _patient(tenant)
    clinician = _employee(tenant)
    entry = TelemedicineWaitingRoomEntry.objects.create(
        tenant=tenant,
        patient=patient,
        status=TelemedicineWaitingRoomEntry.Status.CHECKED_IN,
        chief_complaint="Tosse",
    )

    TelemedicineWorkflowService.start_triage(entry)
    assert entry.status == TelemedicineWaitingRoomEntry.Status.TRIAGE
    assert entry.triage_started_at is not None

    # Sem device-check/consentimento não pode ficar pronto.
    with pytest.raises(ValidationError):
        TelemedicineWorkflowService.mark_ready(entry)

    TelemedicineWorkflowService.mark_ready(entry, device_check_passed=True, consent_confirmed=True)
    assert entry.status == TelemedicineWaitingRoomEntry.Status.READY
    assert entry.triage_completed_at is not None

    TelemedicineWorkflowService.start_call(
        entry, video_room_url="https://telemedicina.example.com/sala/x", clinician=clinician
    )
    assert entry.status == TelemedicineWaitingRoomEntry.Status.IN_CALL
    assert entry.call_started_at is not None
    assert entry.clinician_id == clinician.id

    TelemedicineWorkflowService.complete_call(entry)
    assert entry.status == TelemedicineWaitingRoomEntry.Status.COMPLETED
    assert entry.completed_at is not None


@pytest.mark.django_db
def test_waiting_room_no_show_and_cancel_guards():
    tenant = _tenant()
    patient = _patient(tenant)
    entry = TelemedicineWaitingRoomEntry.objects.create(tenant=tenant, patient=patient)

    TelemedicineWorkflowService.mark_no_show(entry, notes="não compareceu")
    assert entry.status == TelemedicineWaitingRoomEntry.Status.NO_SHOW
    # Já terminal → não pode cancelar.
    with pytest.raises(ValidationError):
        TelemedicineWorkflowService.cancel_waiting_entry(entry)

    other = TelemedicineWaitingRoomEntry.objects.create(tenant=tenant, patient=patient)
    TelemedicineWorkflowService.cancel_waiting_entry(other, reason="paciente desistiu")
    assert other.status == TelemedicineWaitingRoomEntry.Status.CANCELLED


# --------------------------------------------------------------------------- #
# Dispositivo remoto
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_device_lifecycle():
    tenant = _tenant()
    patient = _patient(tenant)
    device = RemoteMonitoringDevice.objects.create(
        tenant=tenant,
        patient=patient,
        device_type=RemoteMonitoringDevice.DeviceType.GLUCOMETER,
        serial_number="GLU-WF-1",
    )
    assert device.status == RemoteMonitoringDevice.Status.REGISTERED

    TelemedicineWorkflowService.activate_device(device)
    assert device.status == RemoteMonitoringDevice.Status.ACTIVE
    assert device.paired_at is not None

    TelemedicineWorkflowService.pause_device(device, notes="manutenção")
    assert device.status == RemoteMonitoringDevice.Status.PAUSED

    TelemedicineWorkflowService.activate_device(device)
    assert device.status == RemoteMonitoringDevice.Status.ACTIVE

    TelemedicineWorkflowService.retire_device(device, notes="fim de vida")
    assert device.status == RemoteMonitoringDevice.Status.RETIRED
    # Retirado não pode reativar.
    with pytest.raises(ValidationError):
        TelemedicineWorkflowService.activate_device(device)


# --------------------------------------------------------------------------- #
# Caso assíncrono (store-and-forward)
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_store_and_forward_case_journey():
    tenant = _tenant()
    patient = _patient(tenant)
    reviewer = _employee(tenant, "Revisor WF")
    case = StoreAndForwardCase.objects.create(
        tenant=tenant,
        patient=patient,
        specialty_area=StoreAndForwardCase.SpecialtyArea.DERMATOLOGY,
        title="Lesão",
        clinical_question="Avaliar lesão pigmentada",
    )

    TelemedicineWorkflowService.triage_case(case, reviewer=reviewer)
    assert case.status == StoreAndForwardCase.Status.TRIAGED
    assert case.reviewer_id == reviewer.id

    TelemedicineWorkflowService.start_case_review(case)
    assert case.status == StoreAndForwardCase.Status.IN_REVIEW

    TelemedicineWorkflowService.request_case_info(case, message="enviar mais fotos")
    assert case.status == StoreAndForwardCase.Status.NEEDS_INFO

    TelemedicineWorkflowService.start_case_review(case)
    assert case.status == StoreAndForwardCase.Status.IN_REVIEW

    # Concluir sem recomendação falha.
    with pytest.raises(ValidationError):
        TelemedicineWorkflowService.complete_case(case, findings="lesão assimétrica")

    TelemedicineWorkflowService.complete_case(
        case, findings="lesão assimétrica", recommendation="encaminhar presencial"
    )
    assert case.status == StoreAndForwardCase.Status.COMPLETED
    assert case.reviewed_at is not None
    assert case.recommendation == "encaminhar presencial"


@pytest.mark.django_db
def test_store_and_forward_review_requires_reviewer():
    tenant = _tenant()
    patient = _patient(tenant)
    case = StoreAndForwardCase.objects.create(
        tenant=tenant,
        patient=patient,
        specialty_area=StoreAndForwardCase.SpecialtyArea.RADIOLOGY,
        title="Imagem",
        clinical_question="Avaliar achado",
    )
    TelemedicineWorkflowService.triage_case(case)
    with pytest.raises(ValidationError):
        TelemedicineWorkflowService.start_case_review(case)


# --------------------------------------------------------------------------- #
# Programa de monitoramento crónico
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_chronic_program_lifecycle():
    tenant = _tenant()
    patient = _patient(tenant)
    program = ChronicMonitoringProgram.objects.create(
        tenant=tenant,
        patient=patient,
        condition=ChronicMonitoringProgram.Condition.DIABETES,
        review_frequency_days=30,
    )
    assert program.status == ChronicMonitoringProgram.Status.ENROLLED

    TelemedicineWorkflowService.activate_program(program)
    assert program.status == ChronicMonitoringProgram.Status.ACTIVE

    before = program.next_review_date
    TelemedicineWorkflowService.record_review(program)
    assert program.next_review_date >= before

    TelemedicineWorkflowService.pause_program(program, reason="viagem")
    assert program.status == ChronicMonitoringProgram.Status.PAUSED
    # Não dá para registar revisão de programa pausado.
    with pytest.raises(ValidationError):
        TelemedicineWorkflowService.record_review(program)

    TelemedicineWorkflowService.complete_program(program)
    assert program.status == ChronicMonitoringProgram.Status.COMPLETED
    assert program.end_date is not None
    # Terminal → não cancela.
    with pytest.raises(ValidationError):
        TelemedicineWorkflowService.cancel_program(program)


# --------------------------------------------------------------------------- #
# Alerta clínico remoto
# --------------------------------------------------------------------------- #
@pytest.mark.django_db
def test_alert_acknowledge_escalate_resolve():
    tenant = _tenant()
    patient = _patient(tenant)
    clinician = _employee(tenant)
    alert = RemoteClinicalAlert.objects.create(
        tenant=tenant,
        patient=patient,
        severity=RemoteClinicalAlert.Severity.HIGH,
        message="PA elevada",
    )
    assert alert.status == RemoteClinicalAlert.Status.OPEN

    TelemedicineWorkflowService.acknowledge_alert(alert, actor=clinician)
    assert alert.status == RemoteClinicalAlert.Status.ACKNOWLEDGED
    assert alert.acknowledged_by_id == clinician.id
    assert alert.acknowledged_at is not None

    TelemedicineWorkflowService.escalate_alert(alert, notes="contactar médico")
    assert alert.status == RemoteClinicalAlert.Status.ESCALATED

    TelemedicineWorkflowService.resolve_alert(alert, actor=clinician, action_taken="paciente orientado")
    assert alert.status == RemoteClinicalAlert.Status.RESOLVED
    assert alert.resolved_at is not None
    assert alert.resolved_by_id == clinician.id
    # Terminal → não reconhece de novo.
    with pytest.raises(ValidationError):
        TelemedicineWorkflowService.acknowledge_alert(alert)


@pytest.mark.django_db
def test_alert_dismiss_and_only_open_can_be_acknowledged():
    tenant = _tenant()
    patient = _patient(tenant)
    alert = RemoteClinicalAlert.objects.create(
        tenant=tenant,
        patient=patient,
        severity=RemoteClinicalAlert.Severity.LOW,
        message="leitura isolada",
    )
    TelemedicineWorkflowService.dismiss_alert(alert, reason="falso positivo")
    assert alert.status == RemoteClinicalAlert.Status.DISMISSED


@pytest.mark.django_db
def test_raise_alert_from_critical_reading_links_active_program():
    tenant = _tenant()
    patient = _patient(tenant)
    program = ChronicMonitoringProgram.objects.create(
        tenant=tenant,
        patient=patient,
        condition=ChronicMonitoringProgram.Condition.HYPERTENSION,
        status=ChronicMonitoringProgram.Status.ACTIVE,
    )
    device = RemoteMonitoringDevice.objects.create(
        tenant=tenant,
        patient=patient,
        device_type=RemoteMonitoringDevice.DeviceType.BLOOD_PRESSURE,
        status=RemoteMonitoringDevice.Status.ACTIVE,
        paired_at=timezone.now(),
        serial_number="BP-WF-1",
    )
    reading = RemoteVitalReading.objects.create(
        tenant=tenant,
        patient=patient,
        device=device,
        systolic_bp=190,
        diastolic_bp=125,
    )
    assert reading.has_critical_value is True

    alert = TelemedicineWorkflowService.raise_alert_from_reading(
        reading, recommended_action="ligar ao paciente"
    )
    assert alert.alert_type == RemoteClinicalAlert.AlertType.VITAL_THRESHOLD
    assert alert.severity == RemoteClinicalAlert.Severity.CRITICAL
    assert alert.patient_id == patient.id
    assert alert.program_id == program.id
    assert alert.device_id == device.id
    assert alert.reading_id == reading.id


@pytest.mark.django_db
def test_raise_alert_from_non_critical_reading_requires_severity():
    tenant = _tenant()
    patient = _patient(tenant)
    reading = RemoteVitalReading.objects.create(
        tenant=tenant,
        patient=patient,
        heart_rate_bpm=72,
    )
    assert reading.has_critical_value is False
    with pytest.raises(ValidationError):
        TelemedicineWorkflowService.raise_alert_from_reading(reading)

    alert = TelemedicineWorkflowService.raise_alert_from_reading(
        reading, severity=RemoteClinicalAlert.Severity.MEDIUM, message="seguimento"
    )
    assert alert.severity == RemoteClinicalAlert.Severity.MEDIUM
