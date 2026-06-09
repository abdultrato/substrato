"""Lógica de jornada da Telemedicina e Monitoramento Remoto (§42).

Os modelos e o CRUD da API já existem; o que faltava era a *lógica de jornada*
(transições de estado + orquestração entre entidades). Seguindo o padrão do
projeto (ver dental/veterinária), centralizamos os casos de uso aqui em
``TelemedicineWorkflowService`` (staticmethods + ``@transaction.atomic``), que
levantam ``django.core.exceptions.ValidationError`` para erros de domínio.

Telemedicina **não tem** modelo de auditoria nem de faturação dedicados, por
isso o serviço apenas faz transições e orquestração clínica (sem evento de
auditoria persistido nem item faturável).
"""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.telemedicine.models import (
    ChronicMonitoringProgram,
    RemoteClinicalAlert,
    RemoteMonitoringDevice,
    RemoteVitalReading,
    StoreAndForwardCase,
    TelemedicineWaitingRoomEntry,
)

# Estados terminais por entidade (não admitem mais transições do fluxo).
_WAITING_TERMINAL = {
    TelemedicineWaitingRoomEntry.Status.COMPLETED,
    TelemedicineWaitingRoomEntry.Status.NO_SHOW,
    TelemedicineWaitingRoomEntry.Status.CANCELLED,
}
_CASE_TERMINAL = {
    StoreAndForwardCase.Status.COMPLETED,
    StoreAndForwardCase.Status.CANCELLED,
}
_PROGRAM_TERMINAL = {
    ChronicMonitoringProgram.Status.COMPLETED,
    ChronicMonitoringProgram.Status.CANCELLED,
}
_ALERT_TERMINAL = {
    RemoteClinicalAlert.Status.RESOLVED,
    RemoteClinicalAlert.Status.DISMISSED,
}


def _append(current: str, label: str, text: str) -> str:
    """Anexa uma nota rotulada a um campo de texto sem destruir o histórico."""
    text = (text or "").strip()
    if not text:
        return current or ""
    addition = f"[{label}] {text}"
    return f"{current}\n{addition}".strip() if current else addition


class TelemedicineWorkflowService:
    """Casos de uso da telemedicina: sala virtual, dispositivos, casos
    assíncronos, programas crónicos e alertas clínicos remotos."""

    # ================================================================== #
    # Sala de espera virtual (TelemedicineWaitingRoomEntry)
    # CHECKED_IN → TRIAGE → READY → IN_CALL → COMPLETED  (+ NO_SHOW/CANCELLED)
    # ================================================================== #
    @staticmethod
    @transaction.atomic
    def start_triage(entry: TelemedicineWaitingRoomEntry) -> TelemedicineWaitingRoomEntry:
        if entry.status != TelemedicineWaitingRoomEntry.Status.CHECKED_IN:
            raise ValidationError({"status": "Só é possível iniciar triagem de quem está na sala de espera."})
        entry.status = TelemedicineWaitingRoomEntry.Status.TRIAGE
        if not entry.triage_started_at:
            entry.triage_started_at = timezone.now()
        entry.save()
        return entry

    @staticmethod
    @transaction.atomic
    def mark_ready(
        entry: TelemedicineWaitingRoomEntry,
        *,
        device_check_passed: bool | None = None,
        consent_confirmed: bool | None = None,
        triage_notes: str = "",
    ) -> TelemedicineWaitingRoomEntry:
        if entry.status not in {
            TelemedicineWaitingRoomEntry.Status.CHECKED_IN,
            TelemedicineWaitingRoomEntry.Status.TRIAGE,
        }:
            raise ValidationError({"status": "Apenas entradas em espera ou triagem podem ficar prontas."})
        if device_check_passed is not None:
            entry.device_check_passed = bool(device_check_passed)
        if consent_confirmed is not None:
            entry.consent_confirmed = bool(consent_confirmed)
        if not (entry.device_check_passed and entry.consent_confirmed):
            raise ValidationError(
                {"status": "Para ficar pronto, confirme o teste de dispositivo e o consentimento."}
            )
        if triage_notes:
            entry.triage_notes = _append(entry.triage_notes, "triagem", triage_notes)
        if entry.triage_started_at and not entry.triage_completed_at:
            entry.triage_completed_at = timezone.now()
        entry.status = TelemedicineWaitingRoomEntry.Status.READY
        entry.save()
        return entry

    @staticmethod
    @transaction.atomic
    def start_call(
        entry: TelemedicineWaitingRoomEntry,
        *,
        video_room_url: str = "",
        clinician=None,
    ) -> TelemedicineWaitingRoomEntry:
        if entry.status != TelemedicineWaitingRoomEntry.Status.READY:
            raise ValidationError({"status": "A chamada só pode iniciar quando a entrada está pronta."})
        if video_room_url:
            entry.video_room_url = video_room_url
        if clinician is not None:
            entry.clinician = clinician
        entry.status = TelemedicineWaitingRoomEntry.Status.IN_CALL
        if not entry.call_started_at:
            entry.call_started_at = timezone.now()
        entry.save()
        return entry

    @staticmethod
    @transaction.atomic
    def complete_call(entry: TelemedicineWaitingRoomEntry) -> TelemedicineWaitingRoomEntry:
        if entry.status != TelemedicineWaitingRoomEntry.Status.IN_CALL:
            raise ValidationError({"status": "Só é possível concluir uma entrada que está em chamada."})
        entry.status = TelemedicineWaitingRoomEntry.Status.COMPLETED
        entry.completed_at = timezone.now()
        entry.save()
        return entry

    @staticmethod
    @transaction.atomic
    def mark_no_show(entry: TelemedicineWaitingRoomEntry, *, notes: str = "") -> TelemedicineWaitingRoomEntry:
        if entry.status in _WAITING_TERMINAL or entry.status == TelemedicineWaitingRoomEntry.Status.IN_CALL:
            raise ValidationError({"status": "Não é possível marcar ausência nesta fase."})
        entry.status = TelemedicineWaitingRoomEntry.Status.NO_SHOW
        if notes:
            entry.notes = _append(entry.notes, "ausência", notes)
        entry.save()
        return entry

    @staticmethod
    @transaction.atomic
    def cancel_waiting_entry(entry: TelemedicineWaitingRoomEntry, *, reason: str = "") -> TelemedicineWaitingRoomEntry:
        if entry.status in _WAITING_TERMINAL:
            raise ValidationError({"status": "A entrada já está num estado final."})
        entry.status = TelemedicineWaitingRoomEntry.Status.CANCELLED
        if reason:
            entry.notes = _append(entry.notes, "cancelamento", reason)
        entry.save()
        return entry

    # ================================================================== #
    # Dispositivo remoto (RemoteMonitoringDevice)
    # REGISTERED → ACTIVE ⇄ PAUSED  (+ LOST/RETIRED)
    # ================================================================== #
    @staticmethod
    @transaction.atomic
    def activate_device(device: RemoteMonitoringDevice, *, paired_at=None) -> RemoteMonitoringDevice:
        if device.status in {RemoteMonitoringDevice.Status.LOST, RemoteMonitoringDevice.Status.RETIRED}:
            raise ValidationError({"status": "Dispositivos perdidos ou retirados não podem ser ativados."})
        device.paired_at = paired_at or device.paired_at or timezone.now()
        device.status = RemoteMonitoringDevice.Status.ACTIVE
        device.save()
        return device

    @staticmethod
    @transaction.atomic
    def pause_device(device: RemoteMonitoringDevice, *, notes: str = "") -> RemoteMonitoringDevice:
        if device.status != RemoteMonitoringDevice.Status.ACTIVE:
            raise ValidationError({"status": "Apenas dispositivos ativos podem ser pausados."})
        device.status = RemoteMonitoringDevice.Status.PAUSED
        if notes:
            device.notes = _append(device.notes, "pausa", notes)
        device.save()
        return device

    @staticmethod
    @transaction.atomic
    def mark_device_lost(device: RemoteMonitoringDevice, *, notes: str = "") -> RemoteMonitoringDevice:
        if device.status == RemoteMonitoringDevice.Status.RETIRED:
            raise ValidationError({"status": "Dispositivos retirados não podem ser marcados como perdidos."})
        device.status = RemoteMonitoringDevice.Status.LOST
        if notes:
            device.notes = _append(device.notes, "perda", notes)
        device.save()
        return device

    @staticmethod
    @transaction.atomic
    def retire_device(device: RemoteMonitoringDevice, *, notes: str = "") -> RemoteMonitoringDevice:
        if device.status == RemoteMonitoringDevice.Status.RETIRED:
            raise ValidationError({"status": "O dispositivo já está retirado."})
        device.status = RemoteMonitoringDevice.Status.RETIRED
        if notes:
            device.notes = _append(device.notes, "retirada", notes)
        device.save()
        return device

    # ================================================================== #
    # Caso assíncrono / store-and-forward (StoreAndForwardCase)
    # SUBMITTED → TRIAGED → IN_REVIEW ⇄ NEEDS_INFO → COMPLETED (+ CANCELLED)
    # ================================================================== #
    @staticmethod
    @transaction.atomic
    def triage_case(case: StoreAndForwardCase, *, reviewer=None) -> StoreAndForwardCase:
        if case.status != StoreAndForwardCase.Status.SUBMITTED:
            raise ValidationError({"status": "Apenas casos submetidos podem ser triados."})
        if reviewer is not None:
            case.reviewer = reviewer
        case.status = StoreAndForwardCase.Status.TRIAGED
        case.save()
        return case

    @staticmethod
    @transaction.atomic
    def start_case_review(case: StoreAndForwardCase, *, reviewer=None) -> StoreAndForwardCase:
        if case.status not in {
            StoreAndForwardCase.Status.TRIAGED,
            StoreAndForwardCase.Status.NEEDS_INFO,
            StoreAndForwardCase.Status.SUBMITTED,
        }:
            raise ValidationError({"status": "O caso não está num estado que permita iniciar a revisão."})
        if reviewer is not None:
            case.reviewer = reviewer
        if case.reviewer_id is None:
            raise ValidationError({"reviewer": "Defina um revisor antes de iniciar a revisão."})
        case.status = StoreAndForwardCase.Status.IN_REVIEW
        case.save()
        return case

    @staticmethod
    @transaction.atomic
    def request_case_info(case: StoreAndForwardCase, *, message: str = "") -> StoreAndForwardCase:
        if case.status not in {StoreAndForwardCase.Status.IN_REVIEW, StoreAndForwardCase.Status.TRIAGED}:
            raise ValidationError({"status": "Só é possível pedir informação durante a triagem ou revisão."})
        case.status = StoreAndForwardCase.Status.NEEDS_INFO
        if message:
            case.notes = _append(case.notes, "pedido de informação", message)
        case.save()
        return case

    @staticmethod
    @transaction.atomic
    def complete_case(
        case: StoreAndForwardCase,
        *,
        findings: str = "",
        recommendation: str = "",
        reviewer=None,
    ) -> StoreAndForwardCase:
        if case.status != StoreAndForwardCase.Status.IN_REVIEW:
            raise ValidationError({"status": "Apenas casos em revisão podem ser concluídos."})
        if reviewer is not None:
            case.reviewer = reviewer
        if findings:
            case.findings = findings
        if recommendation:
            case.recommendation = recommendation
        if not case.recommendation:
            raise ValidationError({"recommendation": "Casos concluídos exigem uma recomendação."})
        case.reviewed_at = timezone.now()
        case.status = StoreAndForwardCase.Status.COMPLETED
        case.save()
        return case

    @staticmethod
    @transaction.atomic
    def cancel_case(case: StoreAndForwardCase, *, reason: str = "") -> StoreAndForwardCase:
        if case.status in _CASE_TERMINAL:
            raise ValidationError({"status": "O caso já está num estado final."})
        case.status = StoreAndForwardCase.Status.CANCELLED
        if reason:
            case.notes = _append(case.notes, "cancelamento", reason)
        case.save()
        return case

    # ================================================================== #
    # Programa de monitoramento crónico (ChronicMonitoringProgram)
    # ENROLLED → ACTIVE ⇄ PAUSED → COMPLETED  (+ CANCELLED)
    # ================================================================== #
    @staticmethod
    @transaction.atomic
    def activate_program(program: ChronicMonitoringProgram) -> ChronicMonitoringProgram:
        if program.status not in {
            ChronicMonitoringProgram.Status.ENROLLED,
            ChronicMonitoringProgram.Status.PAUSED,
        }:
            raise ValidationError({"status": "Apenas programas inscritos ou pausados podem ser ativados."})
        program.status = ChronicMonitoringProgram.Status.ACTIVE
        program.save()
        return program

    @staticmethod
    @transaction.atomic
    def pause_program(program: ChronicMonitoringProgram, *, reason: str = "") -> ChronicMonitoringProgram:
        if program.status != ChronicMonitoringProgram.Status.ACTIVE:
            raise ValidationError({"status": "Apenas programas ativos podem ser pausados."})
        program.status = ChronicMonitoringProgram.Status.PAUSED
        if reason:
            program.notes = _append(program.notes, "pausa", reason)
        program.save()
        return program

    @staticmethod
    @transaction.atomic
    def record_review(program: ChronicMonitoringProgram, *, next_review_date=None) -> ChronicMonitoringProgram:
        if program.status != ChronicMonitoringProgram.Status.ACTIVE:
            raise ValidationError({"status": "Só é possível registar revisão de programas ativos."})
        if next_review_date is not None:
            program.next_review_date = next_review_date
        else:
            base = timezone.localdate()
            program.next_review_date = base + timezone.timedelta(days=program.review_frequency_days)
        program.save()
        return program

    @staticmethod
    @transaction.atomic
    def complete_program(program: ChronicMonitoringProgram, *, end_date=None) -> ChronicMonitoringProgram:
        if program.status not in {
            ChronicMonitoringProgram.Status.ACTIVE,
            ChronicMonitoringProgram.Status.PAUSED,
        }:
            raise ValidationError({"status": "Apenas programas ativos ou pausados podem ser concluídos."})
        program.end_date = end_date or program.end_date or timezone.localdate()
        program.status = ChronicMonitoringProgram.Status.COMPLETED
        program.save()
        return program

    @staticmethod
    @transaction.atomic
    def cancel_program(program: ChronicMonitoringProgram, *, reason: str = "") -> ChronicMonitoringProgram:
        if program.status in _PROGRAM_TERMINAL:
            raise ValidationError({"status": "O programa já está num estado final."})
        program.status = ChronicMonitoringProgram.Status.CANCELLED
        if reason:
            program.notes = _append(program.notes, "cancelamento", reason)
        program.save()
        return program

    # ================================================================== #
    # Alerta clínico remoto (RemoteClinicalAlert)
    # OPEN → ACKNOWLEDGED → ESCALATED → RESOLVED  (+ DISMISSED)
    # ================================================================== #
    @staticmethod
    @transaction.atomic
    def acknowledge_alert(alert: RemoteClinicalAlert, *, actor=None) -> RemoteClinicalAlert:
        if alert.status != RemoteClinicalAlert.Status.OPEN:
            raise ValidationError({"status": "Apenas alertas abertos podem ser reconhecidos."})
        alert.status = RemoteClinicalAlert.Status.ACKNOWLEDGED
        if actor is not None:
            alert.acknowledged_by = actor
        alert.save()
        return alert

    @staticmethod
    @transaction.atomic
    def escalate_alert(alert: RemoteClinicalAlert, *, actor=None, notes: str = "") -> RemoteClinicalAlert:
        if alert.status not in {RemoteClinicalAlert.Status.OPEN, RemoteClinicalAlert.Status.ACKNOWLEDGED}:
            raise ValidationError({"status": "Apenas alertas abertos ou reconhecidos podem ser escalonados."})
        if actor is not None and alert.acknowledged_by_id is None:
            alert.acknowledged_by = actor
        alert.status = RemoteClinicalAlert.Status.ESCALATED
        if notes:
            alert.action_taken = _append(alert.action_taken, "escalonamento", notes)
        alert.save()
        return alert

    @staticmethod
    @transaction.atomic
    def resolve_alert(alert: RemoteClinicalAlert, *, actor=None, action_taken: str = "") -> RemoteClinicalAlert:
        if alert.status in _ALERT_TERMINAL:
            raise ValidationError({"status": "O alerta já está num estado final."})
        if action_taken:
            alert.action_taken = _append(alert.action_taken, "resolução", action_taken)
        alert.status = RemoteClinicalAlert.Status.RESOLVED
        alert.resolved_at = timezone.now()
        if actor is not None:
            alert.resolved_by = actor
        alert.save()
        return alert

    @staticmethod
    @transaction.atomic
    def dismiss_alert(alert: RemoteClinicalAlert, *, actor=None, reason: str = "") -> RemoteClinicalAlert:
        if alert.status in _ALERT_TERMINAL:
            raise ValidationError({"status": "O alerta já está num estado final."})
        if actor is not None and alert.acknowledged_by_id is None:
            alert.acknowledged_by = actor
        alert.status = RemoteClinicalAlert.Status.DISMISSED
        if reason:
            alert.action_taken = _append(alert.action_taken, "descarte", reason)
        alert.save()
        return alert

    @staticmethod
    @transaction.atomic
    def raise_alert_from_reading(
        reading: RemoteVitalReading,
        *,
        severity: str | None = None,
        message: str = "",
        recommended_action: str = "",
        program: ChronicMonitoringProgram | None = None,
    ) -> RemoteClinicalAlert:
        """Gera um alerta de limiar de sinais vitais a partir de uma leitura.

        Orquestração clínica: converte uma leitura remota (tipicamente crítica)
        num alerta acionável, ligando paciente/dispositivo/programa.
        """
        if severity is None and not reading.has_critical_value:
            raise ValidationError(
                {"reading": "A leitura não tem valor crítico; informe a severidade para gerar alerta manual."}
            )
        if program is not None and program.patient_id != reading.patient_id:
            raise ValidationError({"program": "O programa deve pertencer ao paciente da leitura."})
        if program is None:
            program = (
                ChronicMonitoringProgram.objects.filter(
                    patient_id=reading.patient_id,
                    status=ChronicMonitoringProgram.Status.ACTIVE,
                )
                .order_by("-start_date", "-created_at")
                .first()
            )
        alert = RemoteClinicalAlert(
            tenant_id=reading.tenant_id,
            patient_id=reading.patient_id,
            program=program,
            reading=reading,
            device_id=reading.device_id,
            alert_type=RemoteClinicalAlert.AlertType.VITAL_THRESHOLD,
            severity=severity or RemoteClinicalAlert.Severity.CRITICAL,
            status=RemoteClinicalAlert.Status.OPEN,
            message=message or "Leitura remota com valores fora do limiar.",
            recommended_action=recommended_action,
        )
        alert.save()
        return alert
