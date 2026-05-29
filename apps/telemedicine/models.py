from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.consultations.models.medical_consultation import MedicalConsultation
from core.models.base import NoNameCoreModel

ZERO = Decimal("0.00")
PERCENT_VALIDATORS = [MinValueValidator(ZERO), MaxValueValidator(Decimal("100.00"))]
POSITIVE_DECIMAL_VALIDATORS = [MinValueValidator(Decimal("0.001"))]


class TelemedicineWaitingRoomEntry(NoNameCoreModel):
    class Status(models.TextChoices):
        CHECKED_IN = "CHECKED_IN", "Na sala de espera"
        TRIAGE = "TRIAGE", "Em triagem"
        READY = "READY", "Pronto para atendimento"
        IN_CALL = "IN_CALL", "Em chamada"
        COMPLETED = "COMPLETED", "Concluída"
        NO_SHOW = "NO_SHOW", "Ausente"
        CANCELLED = "CANCELLED", "Cancelada"

    class Priority(models.TextChoices):
        ROUTINE = "ROUTINE", "Rotina"
        PRIORITY = "PRIORITY", "Prioritário"
        URGENT = "URGENT", "Urgente"
        EMERGENCY = "EMERGENCY", "Emergência"

    prefix = "TWR"

    consultation = models.ForeignKey(
        "consultas.MedicalConsultation",
        verbose_name="Consulta",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="telemedicine_waiting_entries",
        db_index=True,
    )
    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="telemedicine_waiting_entries",
        db_index=True,
    )
    clinician = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Clínico responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="telemedicine_waiting_entries",
        db_index=True,
    )
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.CHECKED_IN, db_index=True)
    priority = models.CharField("Prioridade", max_length=16, choices=Priority.choices, default=Priority.ROUTINE, db_index=True)
    queue_position = models.PositiveSmallIntegerField("Posição na fila", default=0, db_index=True)
    check_in_at = models.DateTimeField("Entrada na sala", default=timezone.now, db_index=True)
    triage_started_at = models.DateTimeField("Triagem iniciada em", null=True, blank=True)
    triage_completed_at = models.DateTimeField("Triagem concluída em", null=True, blank=True)
    estimated_start_at = models.DateTimeField("Previsão de início", null=True, blank=True, db_index=True)
    call_started_at = models.DateTimeField("Chamada iniciada em", null=True, blank=True)
    completed_at = models.DateTimeField("Concluída em", null=True, blank=True)
    chief_complaint = models.CharField("Queixa principal", max_length=180, blank=True, default="")
    preliminary_symptoms = models.TextField("Sintomas preliminares", blank=True, default="")
    triage_notes = models.TextField("Notas de triagem", blank=True, default="")
    device_check_passed = models.BooleanField("Teste de dispositivo aprovado", default=False, db_index=True)
    consent_confirmed = models.BooleanField("Consentimento confirmado", default=False, db_index=True)
    video_room_url = models.URLField("Sala virtual", max_length=500, blank=True, default="")
    access_token = models.CharField("Token de acesso", max_length=120, blank=True, default="", db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "telemedicina_sala_espera"
        verbose_name = "Sala de Espera Virtual"
        verbose_name_plural = "Sala de Espera Virtual"
        ordering = ["queue_position", "check_in_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "priority"]),
            models.Index(fields=["tenant", "patient", "check_in_at"]),
            models.Index(fields=["tenant", "clinician", "check_in_at"]),
            models.Index(fields=["tenant", "consultation"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "clinician")
        _validate_consultation_patient_match(self)
        if self.consultation_id and self.consultation.consultation_type != MedicalConsultation.ConsultationType.TELEMEDICINE:
            raise ValidationError({"consultation": "A sala virtual exige consulta com modalidade Telemedicina."})
        if self.status == self.Status.READY and not (self.device_check_passed and self.consent_confirmed):
            raise ValidationError({"status": "Para ficar pronto, teste de dispositivo e consentimento devem estar confirmados."})
        if self.triage_completed_at and self.triage_started_at and self.triage_completed_at < self.triage_started_at:
            raise ValidationError({"triage_completed_at": "A conclusão da triagem não pode ser anterior ao início."})
        if self.completed_at and self.call_started_at and self.completed_at < self.call_started_at:
            raise ValidationError({"completed_at": "A conclusão não pode ser anterior ao início da chamada."})

    def save(self, *args, **kwargs):
        if self.consultation_id:
            if not self.patient_id:
                self.patient_id = self.consultation.patient_id
            if not self.clinician_id:
                self.clinician_id = self.consultation.doctor_id
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Sala virtual {self.pk}"


class RemoteMonitoringDevice(NoNameCoreModel):
    class DeviceType(models.TextChoices):
        BLOOD_PRESSURE = "BLOOD_PRESSURE", "Medidor de pressão"
        GLUCOMETER = "GLUCOMETER", "Glicómetro"
        PULSE_OXIMETER = "PULSE_OXIMETER", "Oxímetro"
        WEARABLE = "WEARABLE", "Wearable"
        SPIROMETER = "SPIROMETER", "Espirómetro"
        SCALE = "SCALE", "Balança"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        REGISTERED = "REGISTERED", "Registado"
        ACTIVE = "ACTIVE", "Ativo"
        PAUSED = "PAUSED", "Pausado"
        LOST = "LOST", "Perdido"
        RETIRED = "RETIRED", "Retirado"

    prefix = "RMD"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="remote_monitoring_devices",
        db_index=True,
    )
    device_type = models.CharField("Tipo de dispositivo", max_length=24, choices=DeviceType.choices, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.REGISTERED, db_index=True)
    manufacturer = models.CharField("Fabricante", max_length=120, blank=True, default="")
    model_name = models.CharField("Modelo", max_length=120, blank=True, default="")
    serial_number = models.CharField("Número de série", max_length=120, blank=True, default="", db_index=True)
    external_device_id = models.CharField("ID externo", max_length=120, blank=True, default="", db_index=True)
    paired_at = models.DateTimeField("Pareado em", null=True, blank=True, db_index=True)
    last_sync_at = models.DateTimeField("Última sincronização", null=True, blank=True, db_index=True)
    battery_percent = models.DecimalField(
        "Bateria (%)",
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=PERCENT_VALIDATORS,
    )
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "telemedicina_dispositivo"
        verbose_name = "Dispositivo Remoto"
        verbose_name_plural = "Dispositivos Remotos"
        ordering = ["patient", "device_type", "-last_sync_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "device_type"]),
            models.Index(fields=["tenant", "status", "last_sync_at"]),
            models.Index(fields=["tenant", "serial_number"]),
            models.Index(fields=["tenant", "external_device_id"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "serial_number"],
                condition=models.Q(serial_number__gt="", deleted=False),
                name="uq_remote_device_serial_tenant",
            ),
            models.UniqueConstraint(
                fields=["tenant", "external_device_id"],
                condition=models.Q(external_device_id__gt="", deleted=False),
                name="uq_remote_device_external_tenant",
            ),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        if self.status == self.Status.ACTIVE and not self.paired_at:
            raise ValidationError({"paired_at": "Dispositivo ativo exige data de pareamento."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        label = self.serial_number or self.external_device_id or self.custom_id
        return f"{label} - {self.get_device_type_display()}"


class RemoteVitalReading(NoNameCoreModel):
    class Source(models.TextChoices):
        DEVICE = "DEVICE", "Dispositivo"
        MANUAL = "MANUAL", "Manual"
        INTEGRATION = "INTEGRATION", "Integração"

    prefix = "RVR"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="remote_vital_readings",
        db_index=True,
    )
    device = models.ForeignKey(
        RemoteMonitoringDevice,
        verbose_name="Dispositivo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="readings",
        db_index=True,
    )
    measured_at = models.DateTimeField("Medido em", default=timezone.now, db_index=True)
    received_at = models.DateTimeField("Recebido em", default=timezone.now, db_index=True)
    source = models.CharField("Fonte", max_length=16, choices=Source.choices, default=Source.DEVICE, db_index=True)
    systolic_bp = models.PositiveSmallIntegerField("Pressão sistólica", null=True, blank=True)
    diastolic_bp = models.PositiveSmallIntegerField("Pressão diastólica", null=True, blank=True)
    glucose_mg_dl = models.DecimalField("Glicemia (mg/dL)", max_digits=8, decimal_places=2, null=True, blank=True, validators=POSITIVE_DECIMAL_VALIDATORS)
    spo2_percent = models.DecimalField("SpO2 (%)", max_digits=5, decimal_places=2, null=True, blank=True, validators=PERCENT_VALIDATORS)
    heart_rate_bpm = models.PositiveSmallIntegerField("Frequência cardíaca", null=True, blank=True)
    respiratory_rate = models.PositiveSmallIntegerField("Frequência respiratória", null=True, blank=True)
    temperature_c = models.DecimalField("Temperatura (C)", max_digits=5, decimal_places=2, null=True, blank=True)
    weight_kg = models.DecimalField("Peso (kg)", max_digits=7, decimal_places=2, null=True, blank=True, validators=POSITIVE_DECIMAL_VALIDATORS)
    peak_flow_l_min = models.PositiveSmallIntegerField("Pico de fluxo (L/min)", null=True, blank=True)
    raw_payload = models.JSONField("Payload bruto", blank=True, default=dict)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "telemedicina_leitura_vital"
        verbose_name = "Leitura Remota"
        verbose_name_plural = "Leituras Remotas"
        ordering = ["-measured_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "measured_at"]),
            models.Index(fields=["tenant", "device", "measured_at"]),
            models.Index(fields=["tenant", "source", "received_at"]),
        ]

    @property
    def has_critical_value(self) -> bool:
        return bool(
            (self.systolic_bp and self.systolic_bp >= 180)
            or (self.diastolic_bp and self.diastolic_bp >= 120)
            or (self.spo2_percent is not None and self.spo2_percent < Decimal("90.00"))
            or (self.glucose_mg_dl is not None and (self.glucose_mg_dl < Decimal("54.00") or self.glucose_mg_dl > Decimal("300.00")))
        )

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "device")
        if self.device_id and self.device.patient_id != self.patient_id:
            raise ValidationError({"device": "O dispositivo deve pertencer ao paciente da leitura."})
        if bool(self.systolic_bp) != bool(self.diastolic_bp):
            raise ValidationError({"systolic_bp": "Pressão arterial exige valores sistólico e diastólico."})
        if self.measured_at and self.received_at and self.received_at < self.measured_at - timedelta(days=7):
            raise ValidationError({"received_at": "Receção muito anterior à medição."})
        values = [
            self.systolic_bp,
            self.diastolic_bp,
            self.glucose_mg_dl,
            self.spo2_percent,
            self.heart_rate_bpm,
            self.respiratory_rate,
            self.temperature_c,
            self.weight_kg,
            self.peak_flow_l_min,
        ]
        if not any(value is not None for value in values):
            raise ValidationError("Informe pelo menos uma medição clínica.")

    def save(self, *args, **kwargs):
        if self.device_id and not self.patient_id:
            self.patient_id = self.device.patient_id
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        if self.device_id:
            self.device.last_sync_at = max(self.device.last_sync_at or self.received_at, self.received_at)
            self.device.save(update_fields=["last_sync_at"])
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Leitura {self.pk}"


class StoreAndForwardCase(NoNameCoreModel):
    class SpecialtyArea(models.TextChoices):
        DERMATOLOGY = "DERMATOLOGY", "Dermatologia"
        RADIOLOGY = "RADIOLOGY", "Radiologia"
        OPHTHALMOLOGY = "OPHTHALMOLOGY", "Oftalmologia"
        WOUND_CARE = "WOUND_CARE", "Feridas"
        OTHER = "OTHER", "Outra"

    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submetido"
        TRIAGED = "TRIAGED", "Triado"
        IN_REVIEW = "IN_REVIEW", "Em revisão"
        NEEDS_INFO = "NEEDS_INFO", "Requer informação"
        COMPLETED = "COMPLETED", "Concluído"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "SFC"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="store_forward_cases",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "consultas.MedicalConsultation",
        verbose_name="Consulta associada",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="store_forward_cases",
        db_index=True,
    )
    requested_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Solicitado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_store_forward_cases",
    )
    reviewer = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Revisor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_store_forward_cases",
    )
    specialty_area = models.CharField("Área", max_length=20, choices=SpecialtyArea.choices, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.SUBMITTED, db_index=True)
    submitted_at = models.DateTimeField("Submetido em", default=timezone.now, db_index=True)
    reviewed_at = models.DateTimeField("Revisto em", null=True, blank=True, db_index=True)
    title = models.CharField("Título", max_length=180)
    clinical_question = models.TextField("Pergunta clínica")
    clinical_summary = models.TextField("Resumo clínico", blank=True, default="")
    media_manifest = models.JSONField("Ficheiros/imagens", blank=True, default=list)
    findings = models.TextField("Achados", blank=True, default="")
    recommendation = models.TextField("Recomendação", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "telemedicina_store_forward"
        verbose_name = "Consulta Assíncrona"
        verbose_name_plural = "Consultas Assíncronas"
        ordering = ["-submitted_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "submitted_at"]),
            models.Index(fields=["tenant", "specialty_area", "status"]),
            models.Index(fields=["tenant", "reviewer", "reviewed_at"]),
            models.Index(fields=["tenant", "consultation"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "requested_by")
        _validate_same_tenant(self, "reviewer")
        _validate_consultation_patient_match(self)
        if self.consultation_id and self.consultation.consultation_type not in {
            MedicalConsultation.ConsultationType.ASYNC,
            MedicalConsultation.ConsultationType.TELEMEDICINE,
        }:
            raise ValidationError({"consultation": "Consulta assíncrona exige modalidade assíncrona ou telemedicina."})
        if self.status == self.Status.COMPLETED and not (self.reviewed_at and self.recommendation):
            raise ValidationError({"recommendation": "Casos concluídos exigem revisão e recomendação."})

    def save(self, *args, **kwargs):
        if self.consultation_id and not self.patient_id:
            self.patient_id = self.consultation.patient_id
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class ChronicMonitoringProgram(NoNameCoreModel):
    class Condition(models.TextChoices):
        COPD = "COPD", "DPCO"
        HYPERTENSION = "HYPERTENSION", "Hipertensão"
        DIABETES = "DIABETES", "Diabetes"
        HEART_FAILURE = "HEART_FAILURE", "Insuficiência cardíaca"
        PREGNANCY_RISK = "PREGNANCY_RISK", "Gravidez de risco"
        OTHER = "OTHER", "Outra"

    class Status(models.TextChoices):
        ENROLLED = "ENROLLED", "Inscrito"
        ACTIVE = "ACTIVE", "Ativo"
        PAUSED = "PAUSED", "Pausado"
        COMPLETED = "COMPLETED", "Concluído"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "CMP"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="chronic_monitoring_programs",
        db_index=True,
    )
    care_manager = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Gestor clínico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chronic_monitoring_programs",
    )
    condition = models.CharField("Condição", max_length=24, choices=Condition.choices, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.ENROLLED, db_index=True)
    start_date = models.DateField("Início", default=timezone.localdate, db_index=True)
    end_date = models.DateField("Fim", null=True, blank=True, db_index=True)
    review_frequency_days = models.PositiveSmallIntegerField("Frequência de revisão (dias)", default=30, validators=[MinValueValidator(1)])
    next_review_date = models.DateField("Próxima revisão", null=True, blank=True, db_index=True)
    target_systolic_max = models.PositiveSmallIntegerField("PA sistólica máxima", null=True, blank=True)
    target_diastolic_max = models.PositiveSmallIntegerField("PA diastólica máxima", null=True, blank=True)
    target_glucose_min = models.DecimalField("Glicemia mínima", max_digits=8, decimal_places=2, null=True, blank=True)
    target_glucose_max = models.DecimalField("Glicemia máxima", max_digits=8, decimal_places=2, null=True, blank=True)
    target_spo2_min = models.DecimalField("SpO2 mínima", max_digits=5, decimal_places=2, null=True, blank=True, validators=PERCENT_VALIDATORS)
    care_plan = models.TextField("Plano de cuidado", blank=True, default="")
    escalation_protocol = models.TextField("Protocolo de escalonamento", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "telemedicina_programa_cronico"
        verbose_name = "Programa de Monitoramento Crónico"
        verbose_name_plural = "Programas de Monitoramento Crónico"
        ordering = ["-start_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "condition"]),
            models.Index(fields=["tenant", "condition", "status"]),
            models.Index(fields=["tenant", "care_manager", "next_review_date"]),
            models.Index(fields=["tenant", "next_review_date"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "care_manager")
        if self.end_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "A data final não pode ser anterior ao início."})
        if self.target_glucose_min and self.target_glucose_max and self.target_glucose_min > self.target_glucose_max:
            raise ValidationError({"target_glucose_max": "A glicemia máxima deve ser maior que a mínima."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if not self.next_review_date and self.start_date:
            self.next_review_date = self.start_date + timedelta(days=self.review_frequency_days)
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"{self.get_condition_display()} - {self.patient}"


class RemoteClinicalAlert(NoNameCoreModel):
    class AlertType(models.TextChoices):
        VITAL_THRESHOLD = "VITAL_THRESHOLD", "Limiar de sinais vitais"
        MISSED_READING = "MISSED_READING", "Leitura em falta"
        DEVICE_OFFLINE = "DEVICE_OFFLINE", "Dispositivo offline"
        TRIAGE_RISK = "TRIAGE_RISK", "Risco de triagem"
        OTHER = "OTHER", "Outro"

    class Severity(models.TextChoices):
        INFO = "INFO", "Informativo"
        LOW = "LOW", "Baixo"
        MEDIUM = "MEDIUM", "Médio"
        HIGH = "HIGH", "Alto"
        CRITICAL = "CRITICAL", "Crítico"

    class Status(models.TextChoices):
        OPEN = "OPEN", "Aberto"
        ACKNOWLEDGED = "ACKNOWLEDGED", "Reconhecido"
        ESCALATED = "ESCALATED", "Escalonado"
        RESOLVED = "RESOLVED", "Resolvido"
        DISMISSED = "DISMISSED", "Descartado"

    prefix = "RCA"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="remote_clinical_alerts",
        db_index=True,
    )
    program = models.ForeignKey(
        ChronicMonitoringProgram,
        verbose_name="Programa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
        db_index=True,
    )
    reading = models.ForeignKey(
        RemoteVitalReading,
        verbose_name="Leitura",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
        db_index=True,
    )
    device = models.ForeignKey(
        RemoteMonitoringDevice,
        verbose_name="Dispositivo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
    )
    alert_type = models.CharField("Tipo de alerta", max_length=20, choices=AlertType.choices, default=AlertType.VITAL_THRESHOLD, db_index=True)
    severity = models.CharField("Severidade", max_length=10, choices=Severity.choices, default=Severity.MEDIUM, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.OPEN, db_index=True)
    triggered_at = models.DateTimeField("Disparado em", default=timezone.now, db_index=True)
    acknowledged_at = models.DateTimeField("Reconhecido em", null=True, blank=True)
    resolved_at = models.DateTimeField("Resolvido em", null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Reconhecido por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_remote_alerts",
    )
    resolved_by = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Resolvido por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_remote_alerts",
    )
    message = models.TextField("Mensagem")
    recommended_action = models.TextField("Ação recomendada", blank=True, default="")
    action_taken = models.TextField("Conduta tomada", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "telemedicina_alerta_clinico"
        verbose_name = "Alerta Clínico Remoto"
        verbose_name_plural = "Alertas Clínicos Remotos"
        ordering = ["-triggered_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "triggered_at"]),
            models.Index(fields=["tenant", "severity", "status"]),
            models.Index(fields=["tenant", "alert_type", "status"]),
            models.Index(fields=["tenant", "program", "triggered_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "program")
        _validate_same_tenant(self, "reading")
        _validate_same_tenant(self, "device")
        _validate_same_tenant(self, "acknowledged_by")
        _validate_same_tenant(self, "resolved_by")
        if self.program_id and self.program.patient_id != self.patient_id:
            raise ValidationError({"program": "O programa deve pertencer ao paciente do alerta."})
        if self.reading_id and self.reading.patient_id != self.patient_id:
            raise ValidationError({"reading": "A leitura deve pertencer ao paciente do alerta."})
        if self.device_id and self.device.patient_id != self.patient_id:
            raise ValidationError({"device": "O dispositivo deve pertencer ao paciente do alerta."})
        if self.status == self.Status.RESOLVED and not self.resolved_at:
            raise ValidationError({"resolved_at": "Alertas resolvidos exigem data de resolução."})

    def save(self, *args, **kwargs):
        if self.reading_id and not self.patient_id:
            self.patient_id = self.reading.patient_id
        if self.program_id and not self.patient_id:
            self.patient_id = self.program.patient_id
        if self.device_id and not self.patient_id:
            self.patient_id = self.device.patient_id
        if self.reading_id and not self.device_id:
            self.device_id = self.reading.device_id
        _propagate_tenant_from(self, "patient")
        if self.status in {self.Status.ACKNOWLEDGED, self.Status.ESCALATED} and not self.acknowledged_at:
            self.acknowledged_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Alerta {self.pk}"


def _propagate_tenant_from(instance, field_name: str) -> None:
    if getattr(instance, "tenant_id", None):
        return
    related = getattr(instance, field_name, None)
    if related is not None and getattr(related, "tenant_id", None):
        instance.tenant_id = related.tenant_id


def _validate_same_tenant(instance, field_name: str) -> None:
    related_id = getattr(instance, f"{field_name}_id", None)
    if not related_id or not getattr(instance, "tenant_id", None):
        return
    related = getattr(instance, field_name, None)
    if related is not None and getattr(related, "tenant_id", None) != instance.tenant_id:
        raise ValidationError({field_name: "O registo relacionado deve pertencer ao mesmo tenant."})


def _validate_consultation_patient_match(instance) -> None:
    consultation_id = getattr(instance, "consultation_id", None)
    patient_id = getattr(instance, "patient_id", None)
    if not consultation_id or not patient_id:
        return
    if getattr(instance.consultation, "patient_id", None) != patient_id:
        raise ValidationError({"consultation": "A consulta deve pertencer ao paciente informado."})
