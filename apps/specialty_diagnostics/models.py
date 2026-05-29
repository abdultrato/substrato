from __future__ import annotations

import os

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.mixins.model.position import ScopedPositionMixin
from core.models.base import CoreModel, NoNameCoreModel


class DiagnosticSpecialty(models.TextChoices):
    CARDIOLOGY = "CARDIOLOGY", "Cardiologia"
    NEUROLOGY = "NEUROLOGY", "Neurologia"
    OPHTHALMOLOGY = "OPHTHALMOLOGY", "Oftalmologia"
    OTHER = "OTHER", "Outra"


class DiagnosticModality(models.TextChoices):
    ECG = "ECG", "Eletrocardiograma"
    ECHOCARDIOGRAM = "ECHOCARDIOGRAM", "Ecocardiograma"
    EXERCISE_TEST = "EXERCISE_TEST", "Teste ergométrico"
    HOLTER = "HOLTER", "Holter"
    AMBULATORY_BP = "AMBULATORY_BP", "MAPA"
    EEG = "EEG", "EEG"
    EVOKED_POTENTIAL = "EVOKED_POTENTIAL", "Potencial evocado"
    TRANSCRANIAL_DOPPLER = "TRANSCRANIAL_DOPPLER", "Doppler transcraniano"
    EMG = "EMG", "Eletromiografia"
    VISUAL_FIELD = "VISUAL_FIELD", "Campo visual"
    CORNEAL_TOPOGRAPHY = "CORNEAL_TOPOGRAPHY", "Topografia corneal"
    OCT = "OCT", "OCT"
    TONOMETRY = "TONOMETRY", "Tonometria"
    FUNDUS_PHOTOGRAPHY = "FUNDUS_PHOTOGRAPHY", "Retinografia"
    OTHER = "OTHER", "Outra"


MODALITY_SPECIALTY_MAP = {
    DiagnosticModality.ECG: DiagnosticSpecialty.CARDIOLOGY,
    DiagnosticModality.ECHOCARDIOGRAM: DiagnosticSpecialty.CARDIOLOGY,
    DiagnosticModality.EXERCISE_TEST: DiagnosticSpecialty.CARDIOLOGY,
    DiagnosticModality.HOLTER: DiagnosticSpecialty.CARDIOLOGY,
    DiagnosticModality.AMBULATORY_BP: DiagnosticSpecialty.CARDIOLOGY,
    DiagnosticModality.EEG: DiagnosticSpecialty.NEUROLOGY,
    DiagnosticModality.EVOKED_POTENTIAL: DiagnosticSpecialty.NEUROLOGY,
    DiagnosticModality.TRANSCRANIAL_DOPPLER: DiagnosticSpecialty.NEUROLOGY,
    DiagnosticModality.EMG: DiagnosticSpecialty.NEUROLOGY,
    DiagnosticModality.VISUAL_FIELD: DiagnosticSpecialty.OPHTHALMOLOGY,
    DiagnosticModality.CORNEAL_TOPOGRAPHY: DiagnosticSpecialty.OPHTHALMOLOGY,
    DiagnosticModality.OCT: DiagnosticSpecialty.OPHTHALMOLOGY,
    DiagnosticModality.TONOMETRY: DiagnosticSpecialty.OPHTHALMOLOGY,
    DiagnosticModality.FUNDUS_PHOTOGRAPHY: DiagnosticSpecialty.OPHTHALMOLOGY,
}


class SpecialtyDiagnosticEquipment(CoreModel):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        MAINTENANCE = "MAINTENANCE", "Em manutenção"
        INACTIVE = "INACTIVE", "Inativo"

    prefix = "SDE"

    code = models.CharField("Código", max_length=40, db_index=True)
    specialty = models.CharField("Especialidade", max_length=20, choices=DiagnosticSpecialty.choices, db_index=True)
    modality = models.CharField("Modalidade", max_length=32, choices=DiagnosticModality.choices, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    manufacturer = models.CharField("Fabricante", max_length=120, blank=True, default="")
    model = models.CharField("Modelo", max_length=120, blank=True, default="")
    serial_number = models.CharField("Número de série", max_length=80, blank=True, default="", db_index=True)
    station_name = models.CharField("Estação", max_length=120, blank=True, default="")
    location = models.CharField("Localização", max_length=120, blank=True, default="")
    integration_endpoint = models.CharField("Endpoint de integração", max_length=255, blank=True, default="")
    last_quality_control = models.DateField("Último controlo de qualidade", null=True, blank=True)
    next_quality_control = models.DateField("Próximo controlo de qualidade", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "diagnostico_especializado_equipamento"
        verbose_name = "Equipamento de Diagnóstico Especializado"
        verbose_name_plural = "Equipamentos de Diagnóstico Especializado"
        ordering = ["specialty", "name", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_diag_equipment_code_tenant"),
            models.UniqueConstraint(
                fields=["tenant", "serial_number"],
                condition=~models.Q(serial_number=""),
                name="uq_diag_equipment_serial_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "specialty"]),
            models.Index(fields=["tenant", "modality"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        _validate_modality_for_specialty(self.specialty, self.modality, "modality")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class SpecialtyDiagnosticProtocol(CoreModel):
    prefix = "SDP"

    code = models.CharField("Código", max_length=40, db_index=True)
    specialty = models.CharField("Especialidade", max_length=20, choices=DiagnosticSpecialty.choices, db_index=True)
    modality = models.CharField("Modalidade", max_length=32, choices=DiagnosticModality.choices, db_index=True)
    typical_duration_minutes = models.PositiveSmallIntegerField("Duração típica (min)", default=0)
    preparation = models.TextField("Preparação", blank=True, default="")
    acquisition_instructions = models.TextField("Instruções de execução", blank=True, default="")
    default_measurements = models.JSONField("Medições padrão", default=list, blank=True)
    default_report_template = models.TextField("Modelo de laudo", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "diagnostico_especializado_protocolo"
        verbose_name = "Protocolo de Diagnóstico Especializado"
        verbose_name_plural = "Protocolos de Diagnóstico Especializado"
        ordering = ["specialty", "modality", "name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_diag_protocol_code_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "specialty"]),
            models.Index(fields=["tenant", "modality"]),
        ]

    def clean(self):
        super().clean()
        _validate_modality_for_specialty(self.specialty, self.modality, "modality")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class SpecialtyDiagnosticOrder(NoNameCoreModel):
    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitado"
        SCHEDULED = "SCHEDULED", "Agendado"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        PERFORMED = "PERFORMED", "Realizado"
        REPORTING = "REPORTING", "Em laudo"
        REPORTED = "REPORTED", "Laudado"
        VALIDATED = "VALIDATED", "Validado"
        DELIVERED = "DELIVERED", "Entregue"
        CANCELLED = "CANCELLED", "Cancelado"

    class Priority(models.TextChoices):
        ROUTINE = "ROUTINE", "Rotina"
        URGENT = "URGENT", "Urgente"
        STAT = "STAT", "Emergência"

    prefix = "SDO"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="specialty_diagnostic_orders",
        db_index=True,
    )
    requesting_doctor = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Médico requisitante",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="requested_specialty_diagnostics",
        db_index=True,
    )
    specialist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Especialista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_specialty_diagnostics",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "consultas.MedicalConsultation",
        verbose_name="Consulta associada",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="specialty_diagnostic_orders",
    )
    medical_record = models.ForeignKey(
        "prontuario.MedicalRecordEntry",
        verbose_name="Cardex/Prontuário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="specialty_diagnostic_orders",
    )
    prescription_item = models.ForeignKey(
        "prontuario.PrescriptionItem",
        verbose_name="Item de prescrição médica",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="specialty_diagnostic_orders",
    )
    protocol = models.ForeignKey(
        SpecialtyDiagnosticProtocol,
        verbose_name="Protocolo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    equipment = models.ForeignKey(
        SpecialtyDiagnosticEquipment,
        verbose_name="Equipamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    order_number = models.CharField("Número do exame", max_length=64, blank=True, default="", db_index=True)
    external_order_id = models.CharField("ID externo", max_length=120, blank=True, default="", db_index=True)
    specialty = models.CharField("Especialidade", max_length=20, choices=DiagnosticSpecialty.choices, default=DiagnosticSpecialty.OTHER, db_index=True)
    modality = models.CharField("Modalidade", max_length=32, choices=DiagnosticModality.choices, default=DiagnosticModality.OTHER, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    priority = models.CharField("Prioridade", max_length=16, choices=Priority.choices, default=Priority.ROUTINE, db_index=True)
    clinical_indication = models.TextField("Indicação clínica", blank=True, default="")
    requested_at = models.DateTimeField("Solicitado em", default=timezone.now, db_index=True)
    scheduled_at = models.DateTimeField("Agendado para", null=True, blank=True, db_index=True)
    started_at = models.DateTimeField("Iniciado em", null=True, blank=True)
    performed_at = models.DateTimeField("Realizado em", null=True, blank=True, db_index=True)
    completed_at = models.DateTimeField("Concluído em", null=True, blank=True)
    preparation_notes = models.TextField("Notas de preparação", blank=True, default="")
    acquisition_notes = models.TextField("Notas de execução", blank=True, default="")
    measurements_complete = models.BooleanField("Medições completas", default=False, db_index=True)
    report_available = models.BooleanField("Laudo disponível", default=False, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "diagnostico_especializado_pedido"
        verbose_name = "Exame de Diagnóstico Especializado"
        verbose_name_plural = "Exames de Diagnóstico Especializado"
        ordering = ["-requested_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "order_number"],
                condition=~models.Q(order_number=""),
                name="uq_diag_order_number_tenant",
            ),
            models.UniqueConstraint(
                fields=["tenant", "external_order_id"],
                condition=~models.Q(external_order_id=""),
                name="uq_diag_order_external_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "patient", "requested_at"]),
            models.Index(fields=["tenant", "specialty", "status"]),
            models.Index(fields=["tenant", "modality", "requested_at"]),
            models.Index(fields=["tenant", "priority", "scheduled_at"]),
            models.Index(fields=["tenant", "specialist", "requested_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "requesting_doctor")
        _validate_same_tenant(self, "specialist")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "medical_record")
        _validate_same_tenant(self, "prescription_item")
        _validate_same_tenant(self, "protocol")
        _validate_same_tenant(self, "equipment")
        _validate_patient_match(self, "consultation")
        _validate_patient_match(self, "medical_record")
        _validate_prescription_patient_match(self)
        _validate_modality_for_specialty(self.specialty, self.modality, "modality")
        if self.protocol_id:
            _validate_related_specialty(self, self.protocol, "protocol")
        if self.equipment_id:
            _validate_related_specialty(self, self.equipment, "equipment")
        if self.completed_at and self.started_at and self.completed_at < self.started_at:
            raise ValidationError({"completed_at": "A conclusão não pode ser anterior ao início."})
        if self.performed_at and self.started_at and self.performed_at < self.started_at:
            raise ValidationError({"performed_at": "A realização não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.protocol_id:
            if self.specialty == DiagnosticSpecialty.OTHER:
                self.specialty = self.protocol.specialty
            if self.modality == DiagnosticModality.OTHER:
                self.modality = self.protocol.modality
        elif self.equipment_id:
            if self.specialty == DiagnosticSpecialty.OTHER:
                self.specialty = self.equipment.specialty
            if self.modality == DiagnosticModality.OTHER:
                self.modality = self.equipment.modality
        if self.performed_at and self.status in {self.Status.REQUESTED, self.Status.SCHEDULED, self.Status.IN_PROGRESS}:
            self.status = self.Status.PERFORMED
        self.full_clean()
        return super().save(*args, **kwargs)

    def refresh_measurement_status(self) -> None:
        complete = self.measurements.exists()
        if self.measurements_complete != complete:
            self.measurements_complete = complete
            self.save(update_fields=["measurements_complete"])

    def mark_reported(self) -> None:
        terminal_statuses = {self.Status.VALIDATED, self.Status.DELIVERED, self.Status.CANCELLED}
        fields: list[str] = []
        if self.status not in terminal_statuses:
            self.status = self.Status.REPORTED
            fields.append("status")
        if not self.completed_at:
            self.completed_at = timezone.now()
            fields.append("completed_at")
        if not self.report_available:
            self.report_available = True
            fields.append("report_available")
        if fields:
            self.save(update_fields=fields)

    def __str__(self) -> str:
        return self.order_number or self.custom_id or f"Exame especializado {self.pk}"


class SpecialtyDiagnosticMeasurement(ScopedPositionMixin, CoreModel):
    class ValueType(models.TextChoices):
        NUMERIC = "NUMERIC", "Numérico"
        TEXT = "TEXT", "Texto"
        BOOLEAN = "BOOLEAN", "Booleano"
        WAVEFORM = "WAVEFORM", "Traçado"
        IMAGE = "IMAGE", "Imagem"

    prefix = "SDM"
    position_scope_fields = ("order",)

    order = models.ForeignKey(
        SpecialtyDiagnosticOrder,
        verbose_name="Exame",
        on_delete=models.CASCADE,
        related_name="measurements",
        db_index=True,
    )
    code = models.CharField("Código", max_length=40, blank=True, default="", db_index=True)
    value_type = models.CharField("Tipo de valor", max_length=16, choices=ValueType.choices, default=ValueType.NUMERIC, db_index=True)
    numeric_value = models.DecimalField("Valor numérico", max_digits=12, decimal_places=3, null=True, blank=True)
    text_value = models.TextField("Valor textual", blank=True, default="")
    unit = models.CharField("Unidade", max_length=40, blank=True, default="")
    reference_range = models.CharField("Intervalo de referência", max_length=120, blank=True, default="")
    interpretation = models.TextField("Interpretação", blank=True, default="")
    abnormal = models.BooleanField("Alterado", default=False, db_index=True)
    critical = models.BooleanField("Crítico", default=False, db_index=True)
    measured_at = models.DateTimeField("Medido em", default=timezone.now, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "diagnostico_especializado_medicao"
        verbose_name = "Medição de Diagnóstico Especializado"
        verbose_name_plural = "Medições de Diagnóstico Especializado"
        ordering = ["order", "position", "id"]
        indexes = [
            models.Index(fields=["tenant", "order", "position"]),
            models.Index(fields=["tenant", "code"]),
            models.Index(fields=["tenant", "abnormal", "critical"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "order")
        if self.value_type == self.ValueType.NUMERIC and self.numeric_value is None:
            raise ValidationError({"numeric_value": "Informe o valor numérico da medição."})
        if self.value_type != self.ValueType.NUMERIC and not self.text_value:
            raise ValidationError({"text_value": "Informe o valor textual da medição."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "order")
        self.full_clean()
        result = super().save(*args, **kwargs)
        if self.order_id:
            self.order.refresh_measurement_status()
        return result

    def __str__(self) -> str:
        return self.name


def _diagnostic_report_upload_to(instance, filename):
    order = getattr(instance, "order", None)
    parts = [
        "diagnosticos",
        str(getattr(order, "tenant_id", None) or "tenant"),
        getattr(order, "order_number", "") or getattr(order, "custom_id", "") or str(getattr(instance, "order_id", "order")),
        filename,
    ]
    return os.path.join(*parts)


class SpecialtyDiagnosticReport(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        PRELIMINARY = "PRELIMINARY", "Preliminar"
        FINAL = "FINAL", "Final"
        AMENDED = "AMENDED", "Retificado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "SDR"

    order = models.ForeignKey(
        SpecialtyDiagnosticOrder,
        verbose_name="Exame",
        on_delete=models.CASCADE,
        related_name="reports",
        db_index=True,
    )
    specialist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Especialista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="specialty_diagnostic_reports",
        db_index=True,
    )
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    version_number = models.PositiveSmallIntegerField("Versão", default=1, validators=[MinValueValidator(1)])
    reported_at = models.DateTimeField("Laudado em", default=timezone.now, db_index=True)
    signed_at = models.DateTimeField("Assinado em", null=True, blank=True, db_index=True)
    technique = models.TextField("Técnica", blank=True, default="")
    findings = models.TextField("Achados", blank=True, default="")
    impression = models.TextField("Conclusão/Impressão", blank=True, default="")
    recommendations = models.TextField("Recomendações", blank=True, default="")
    critical_result = models.BooleanField("Resultado crítico", default=False, db_index=True)
    critical_notified_at = models.DateTimeField("Resultado crítico notificado em", null=True, blank=True)
    report_file = models.FileField("Ficheiro do laudo", upload_to=_diagnostic_report_upload_to, null=True, blank=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "diagnostico_especializado_laudo"
        verbose_name = "Laudo de Diagnóstico Especializado"
        verbose_name_plural = "Laudos de Diagnóstico Especializado"
        ordering = ["-reported_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["order", "version_number"], name="uq_diag_report_version_order"),
        ]
        indexes = [
            models.Index(fields=["tenant", "order", "reported_at"]),
            models.Index(fields=["tenant", "specialist", "reported_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "critical_result"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "order")
        _validate_same_tenant(self, "specialist")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "order")
        if self.order_id and not self.specialist_id:
            self.specialist_id = self.order.specialist_id
        if self.status in {self.Status.FINAL, self.Status.AMENDED} and not self.signed_at:
            self.signed_at = timezone.now()
        self.full_clean()
        result = super().save(*args, **kwargs)
        if self.order_id and self.status in {self.Status.FINAL, self.Status.AMENDED}:
            self.order.mark_reported()
        return result

    def __str__(self) -> str:
        return self.custom_id or f"Laudo especializado {self.pk}"


class SpecialtyDiagnosticIntegrationEvent(NoNameCoreModel):
    class EventType(models.TextChoices):
        WORKLIST_CREATE = "WORKLIST_CREATE", "Criar worklist"
        WORKLIST_UPDATE = "WORKLIST_UPDATE", "Atualizar worklist"
        DEVICE_IMPORT = "DEVICE_IMPORT", "Importar do equipamento"
        RESULT_SYNC = "RESULT_SYNC", "Sincronizar resultado"
        REPORT_SEND = "REPORT_SEND", "Enviar laudo"
        ERROR = "ERROR", "Erro"

    class Direction(models.TextChoices):
        OUTBOUND = "OUTBOUND", "Saída"
        INBOUND = "INBOUND", "Entrada"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        SENT = "SENT", "Enviado"
        ACKNOWLEDGED = "ACKNOWLEDGED", "Confirmado"
        FAILED = "FAILED", "Falhou"
        IGNORED = "IGNORED", "Ignorado"

    prefix = "SDI"

    order = models.ForeignKey(
        SpecialtyDiagnosticOrder,
        verbose_name="Exame",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="integration_events",
        db_index=True,
    )
    equipment = models.ForeignKey(
        SpecialtyDiagnosticEquipment,
        verbose_name="Equipamento",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="integration_events",
    )
    event_type = models.CharField("Tipo de evento", max_length=24, choices=EventType.choices, db_index=True)
    direction = models.CharField("Direção", max_length=12, choices=Direction.choices, default=Direction.OUTBOUND, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    external_system = models.CharField("Sistema externo", max_length=120, blank=True, default="")
    order_number = models.CharField("Número do exame", max_length=64, blank=True, default="", db_index=True)
    external_order_id = models.CharField("ID externo", max_length=120, blank=True, default="", db_index=True)
    message_control_id = models.CharField("ID da mensagem", max_length=120, blank=True, default="", db_index=True)
    event_at = models.DateTimeField("Evento em", default=timezone.now, db_index=True)
    payload = models.JSONField("Payload", default=dict, blank=True)
    response = models.JSONField("Resposta", default=dict, blank=True)
    error_message = models.TextField("Mensagem de erro", blank=True, default="")
    retry_count = models.PositiveSmallIntegerField("Tentativas", default=0)

    class Meta:
        db_table = "diagnostico_especializado_integracao"
        verbose_name = "Evento de Integração Diagnóstica"
        verbose_name_plural = "Eventos de Integração Diagnóstica"
        ordering = ["-event_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "order", "event_at"]),
            models.Index(fields=["tenant", "event_type", "status"]),
            models.Index(fields=["tenant", "order_number"]),
            models.Index(fields=["tenant", "external_order_id"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "order")
        _validate_same_tenant(self, "equipment")
        if self.order_id and self.equipment_id:
            _validate_related_specialty(self.order, self.equipment, "equipment")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "order")
        if not self.tenant_id:
            _propagate_tenant_from(self, "equipment")
        if self.order_id:
            self.order_number = self.order_number or self.order.order_number
            self.external_order_id = self.external_order_id or self.order.external_order_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.event_type} - {self.status}"


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


def _validate_patient_match(instance, field_name: str) -> None:
    related_id = getattr(instance, f"{field_name}_id", None)
    patient_id = getattr(instance, "patient_id", None)
    if not related_id or not patient_id:
        return
    related = getattr(instance, field_name, None)
    related_patient_id = getattr(related, "patient_id", None)
    if related_patient_id and related_patient_id != patient_id:
        raise ValidationError({field_name: "O registo relacionado deve pertencer ao mesmo paciente."})


def _validate_prescription_patient_match(instance) -> None:
    if not getattr(instance, "prescription_item_id", None) or not getattr(instance, "patient_id", None):
        return
    record = getattr(instance.prescription_item, "record", None)
    if record is not None and getattr(record, "patient_id", None) != instance.patient_id:
        raise ValidationError({"prescription_item": "A prescrição médica deve pertencer ao paciente informado."})


def _validate_modality_for_specialty(specialty: str, modality: str, field_name: str) -> None:
    expected = MODALITY_SPECIALTY_MAP.get(modality)
    if specialty and modality and specialty != DiagnosticSpecialty.OTHER and expected and expected != specialty:
        raise ValidationError({field_name: "A modalidade não pertence à especialidade informada."})


def _validate_related_specialty(order: SpecialtyDiagnosticOrder, related, field_name: str) -> None:
    if order.specialty != DiagnosticSpecialty.OTHER and related.specialty != order.specialty:
        raise ValidationError({field_name: "O registo relacionado deve pertencer à mesma especialidade."})
    if order.modality != DiagnosticModality.OTHER and related.modality != order.modality:
        raise ValidationError({field_name: "O registo relacionado deve pertencer à mesma modalidade."})
