from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.mixins.model.position import ScopedPositionMixin
from core.models.base import CoreModel, NoNameCoreModel

ZERO = Decimal("0.00")
MIN_NON_NEGATIVE = MinValueValidator(ZERO)
PERCENT_VALIDATORS = [MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))]
SCORE_VALIDATORS = [MinValueValidator(0), MaxValueValidator(10)]


class BodyRegion(models.TextChoices):
    CERVICAL = "CERVICAL", "Cervical"
    SHOULDER = "SHOULDER", "Ombro"
    ELBOW = "ELBOW", "Cotovelo"
    WRIST_HAND = "WRIST_HAND", "Punho/Mão"
    THORACIC = "THORACIC", "Torácica"
    LUMBAR = "LUMBAR", "Lombar"
    HIP = "HIP", "Anca"
    KNEE = "KNEE", "Joelho"
    ANKLE_FOOT = "ANKLE_FOOT", "Tornozelo/Pé"
    NEUROLOGICAL = "NEUROLOGICAL", "Neurológica"
    CARDIORESPIRATORY = "CARDIORESPIRATORY", "Cardiorrespiratória"
    GLOBAL = "GLOBAL", "Global"
    OTHER = "OTHER", "Outra"


class PhysiotherapyDevice(CoreModel):
    class DeviceType(models.TextChoices):
        ELECTROTHERAPY = "ELECTROTHERAPY", "Eletroterapia"
        ULTRASOUND = "ULTRASOUND", "Ultrassom"
        LASER = "LASER", "Laser"
        TENS = "TENS", "TENS"
        CPM = "CPM", "Mobilização passiva contínua"
        EXERCISE = "EXERCISE", "Exercício"
        RESPIRATORY = "RESPIRATORY", "Respiratório"
        MOBILITY = "MOBILITY", "Mobilidade"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        MAINTENANCE = "MAINTENANCE", "Em manutenção"
        INACTIVE = "INACTIVE", "Inativo"

    prefix = "FAP"

    code = models.CharField("Código", max_length=40, db_index=True)
    device_type = models.CharField("Tipo de aparelho", max_length=24, choices=DeviceType.choices, default=DeviceType.EXERCISE, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    manufacturer = models.CharField("Fabricante", max_length=120, blank=True, default="")
    model = models.CharField("Modelo", max_length=120, blank=True, default="")
    serial_number = models.CharField("Número de série", max_length=80, blank=True, default="", db_index=True)
    location = models.CharField("Localização", max_length=120, blank=True, default="")
    last_maintenance = models.DateField("Última manutenção", null=True, blank=True)
    next_maintenance = models.DateField("Próxima manutenção", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "fisioterapia_aparelho"
        verbose_name = "Aparelho de Fisioterapia"
        verbose_name_plural = "Aparelhos de Fisioterapia"
        ordering = ["name", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_physio_device_code_tenant"),
            models.UniqueConstraint(
                fields=["tenant", "serial_number"],
                condition=~models.Q(serial_number=""),
                name="uq_physio_device_serial_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "device_type"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "next_maintenance"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class FunctionalAssessment(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        ACTIVE = "ACTIVE", "Ativa"
        FINALIZED = "FINALIZED", "Finalizada"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "FAF"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="physiotherapy_assessments",
        db_index=True,
    )
    therapist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Fisioterapeuta",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="physiotherapy_assessments",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "consultas.MedicalConsultation",
        verbose_name="Consulta associada",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="physiotherapy_assessments",
    )
    medical_record = models.ForeignKey(
        "prontuario.MedicalRecordEntry",
        verbose_name="Cardex/Prontuário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="physiotherapy_assessments",
    )
    assessed_at = models.DateTimeField("Avaliada em", default=timezone.now, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    primary_complaint = models.TextField("Queixa principal", blank=True, default="")
    clinical_diagnosis = models.TextField("Diagnóstico clínico", blank=True, default="")
    functional_diagnosis = models.TextField("Diagnóstico funcional", blank=True, default="")
    body_region = models.CharField("Região", max_length=24, choices=BodyRegion.choices, default=BodyRegion.GLOBAL, db_index=True)
    pain_score = models.PositiveSmallIntegerField("Dor (0-10)", default=0, validators=SCORE_VALIDATORS)
    mobility_score = models.PositiveSmallIntegerField("Mobilidade (0-10)", default=0, validators=SCORE_VALIDATORS)
    strength_score = models.PositiveSmallIntegerField("Força (0-10)", default=0, validators=SCORE_VALIDATORS)
    balance_score = models.PositiveSmallIntegerField("Equilíbrio (0-10)", default=0, validators=SCORE_VALIDATORS)
    functional_independence_score = models.PositiveSmallIntegerField("Independência funcional (0-10)", default=0, validators=SCORE_VALIDATORS)
    range_of_motion = models.TextField("Amplitude de movimento", blank=True, default="")
    limitations = models.TextField("Limitações funcionais", blank=True, default="")
    goals = models.TextField("Objetivos", blank=True, default="")
    precautions = models.TextField("Precauções/contraindicações", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "fisioterapia_avaliacao_funcional"
        verbose_name = "Avaliação Funcional"
        verbose_name_plural = "Avaliações Funcionais"
        ordering = ["-assessed_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "assessed_at"]),
            models.Index(fields=["tenant", "therapist", "assessed_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "body_region"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "therapist")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "medical_record")
        _validate_patient_match(self, "medical_record")
        _validate_patient_match(self, "consultation")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Avaliação funcional {self.pk}"


class RehabilitationTreatmentPlan(CoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        ACTIVE = "ACTIVE", "Ativo"
        PAUSED = "PAUSED", "Pausado"
        COMPLETED = "COMPLETED", "Concluído"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "FTP"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="rehabilitation_treatment_plans",
        db_index=True,
    )
    therapist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Fisioterapeuta",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rehabilitation_treatment_plans",
    )
    assessment = models.ForeignKey(
        FunctionalAssessment,
        verbose_name="Avaliação funcional",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="treatment_plans",
    )
    medical_record = models.ForeignKey(
        "prontuario.MedicalRecordEntry",
        verbose_name="Cardex/Prontuário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rehabilitation_treatment_plans",
    )
    prescription_item = models.ForeignKey(
        "prontuario.PrescriptionItem",
        verbose_name="Item de prescrição médica",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rehabilitation_treatment_plans",
    )
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    start_date = models.DateField("Data de início", default=timezone.localdate, db_index=True)
    end_date = models.DateField("Data de fim", null=True, blank=True, db_index=True)
    body_region = models.CharField("Região", max_length=24, choices=BodyRegion.choices, default=BodyRegion.GLOBAL, db_index=True)
    frequency_per_week = models.PositiveSmallIntegerField("Sessões por semana", default=1, validators=[MinValueValidator(1)])
    planned_sessions = models.PositiveSmallIntegerField("Sessões planeadas", default=1, validators=[MinValueValidator(1)])
    completed_sessions = models.PositiveSmallIntegerField("Sessões realizadas", default=0)
    progress_percent = models.DecimalField("Progresso (%)", max_digits=5, decimal_places=2, default=ZERO, validators=PERCENT_VALIDATORS)
    objectives = models.TextField("Objetivos terapêuticos", blank=True, default="")
    protocol = models.TextField("Protocolo", blank=True, default="")
    home_program = models.TextField("Programa domiciliar", blank=True, default="")
    precautions = models.TextField("Precauções", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "fisioterapia_plano_tratamento"
        verbose_name = "Plano de Tratamento de Reabilitação"
        verbose_name_plural = "Planos de Tratamento de Reabilitação"
        ordering = ["-start_date", "name"]
        indexes = [
            models.Index(fields=["tenant", "patient", "start_date"]),
            models.Index(fields=["tenant", "therapist", "start_date"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "body_region"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "therapist")
        _validate_same_tenant(self, "assessment")
        _validate_same_tenant(self, "medical_record")
        _validate_same_tenant(self, "prescription_item")
        _validate_patient_match(self, "assessment")
        _validate_patient_match(self, "medical_record")
        _validate_prescription_patient_match(self)
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "A data de fim não pode ser anterior ao início."})
        if self.completed_sessions > self.planned_sessions:
            raise ValidationError({"completed_sessions": "Sessões realizadas não podem exceder as planeadas."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.planned_sessions:
            self.progress_percent = min(
                Decimal("100.00"),
                (Decimal(self.completed_sessions) / Decimal(self.planned_sessions) * Decimal("100.00")).quantize(Decimal("0.01")),
            )
        self.full_clean()
        return super().save(*args, **kwargs)

    def register_session_completion(self) -> None:
        session_count = self.sessions.filter(deleted=False, status=RehabilitationSession.Status.COMPLETED).count()
        self.completed_sessions = min(session_count, self.planned_sessions)
        self.save(update_fields=["completed_sessions", "progress_percent", "updated_at"])

    def __str__(self) -> str:
        return f"{self.name} - {getattr(self.patient, 'name', '')}"


class TreatmentPlanIntervention(ScopedPositionMixin, NoNameCoreModel):
    class InterventionType(models.TextChoices):
        EXERCISE = "EXERCISE", "Exercício terapêutico"
        MANUAL_THERAPY = "MANUAL_THERAPY", "Terapia manual"
        ELECTROTHERAPY = "ELECTROTHERAPY", "Eletroterapia"
        RESPIRATORY = "RESPIRATORY", "Fisioterapia respiratória"
        GAIT_TRAINING = "GAIT_TRAINING", "Treino de marcha"
        MOBILITY = "MOBILITY", "Mobilidade"
        EDUCATION = "EDUCATION", "Educação do paciente"
        OTHER = "OTHER", "Outro"

    prefix = "FTI"
    position_scope_fields = ("plan",)

    plan = models.ForeignKey(
        RehabilitationTreatmentPlan,
        verbose_name="Plano",
        on_delete=models.CASCADE,
        related_name="interventions",
        db_index=True,
    )
    device = models.ForeignKey(
        PhysiotherapyDevice,
        verbose_name="Aparelho",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="planned_interventions",
    )
    intervention_type = models.CharField("Tipo", max_length=24, choices=InterventionType.choices, default=InterventionType.EXERCISE, db_index=True)
    body_region = models.CharField("Região", max_length=24, choices=BodyRegion.choices, default=BodyRegion.GLOBAL, db_index=True)
    description = models.CharField("Descrição", max_length=220)
    dosage = models.CharField("Dosagem/volume", max_length=160, blank=True, default="")
    duration_minutes = models.PositiveSmallIntegerField("Duração (min)", default=0)
    repetitions = models.PositiveSmallIntegerField("Repetições", default=0)
    sets = models.PositiveSmallIntegerField("Séries", default=0)
    intensity = models.CharField("Intensidade", max_length=120, blank=True, default="")
    instructions = models.TextField("Instruções", blank=True, default="")

    class Meta:
        db_table = "fisioterapia_plano_intervencao"
        verbose_name = "Intervenção do Plano"
        verbose_name_plural = "Intervenções do Plano"
        ordering = ["plan", "position", "id"]
        indexes = [
            models.Index(fields=["tenant", "plan", "position"]),
            models.Index(fields=["tenant", "intervention_type"]),
            models.Index(fields=["tenant", "body_region"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "plan")
        _validate_same_tenant(self, "device")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "plan")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.description


class RehabilitationSession(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Agendada"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        COMPLETED = "COMPLETED", "Concluída"
        MISSED = "MISSED", "Faltou"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "FTS"

    plan = models.ForeignKey(
        RehabilitationTreatmentPlan,
        verbose_name="Plano",
        on_delete=models.CASCADE,
        related_name="sessions",
        db_index=True,
    )
    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="rehabilitation_sessions",
        db_index=True,
    )
    therapist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Fisioterapeuta",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rehabilitation_sessions",
    )
    scheduled_at = models.DateTimeField("Agendada para", default=timezone.now, db_index=True)
    started_at = models.DateTimeField("Iniciada em", null=True, blank=True)
    ended_at = models.DateTimeField("Terminada em", null=True, blank=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    duration_minutes = models.PositiveSmallIntegerField("Duração (min)", default=0)
    pain_before = models.PositiveSmallIntegerField("Dor antes (0-10)", default=0, validators=SCORE_VALIDATORS)
    pain_after = models.PositiveSmallIntegerField("Dor depois (0-10)", default=0, validators=SCORE_VALIDATORS)
    mobility_score = models.PositiveSmallIntegerField("Mobilidade (0-10)", default=0, validators=SCORE_VALIDATORS)
    strength_score = models.PositiveSmallIntegerField("Força (0-10)", default=0, validators=SCORE_VALIDATORS)
    balance_score = models.PositiveSmallIntegerField("Equilíbrio (0-10)", default=0, validators=SCORE_VALIDATORS)
    interventions_performed = models.TextField("Intervenções realizadas", blank=True, default="")
    patient_response = models.TextField("Resposta do paciente", blank=True, default="")
    next_steps = models.TextField("Próximos passos", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "fisioterapia_sessao"
        verbose_name = "Sessão de Reabilitação"
        verbose_name_plural = "Sessões de Reabilitação"
        ordering = ["-scheduled_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "plan", "scheduled_at"]),
            models.Index(fields=["tenant", "patient", "scheduled_at"]),
            models.Index(fields=["tenant", "therapist", "scheduled_at"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "plan")
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "therapist")
        if self.plan_id and self.patient_id and self.plan.patient_id != self.patient_id:
            raise ValidationError({"patient": "A sessão deve pertencer ao paciente do plano."})
        if self.ended_at and self.started_at and self.ended_at < self.started_at:
            raise ValidationError({"ended_at": "O fim não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "plan")
        if self.plan_id and not self.patient_id:
            self.patient_id = self.plan.patient_id
        if self.plan_id and not self.therapist_id:
            self.therapist_id = self.plan.therapist_id
        self.full_clean()
        result = super().save(*args, **kwargs)
        if self.plan_id:
            self.plan.register_session_completion()
        return result

    def __str__(self) -> str:
        return self.custom_id or f"Sessão {self.pk}"


class RehabilitationProgressNote(NoNameCoreModel):
    class Trend(models.TextChoices):
        IMPROVED = "IMPROVED", "Melhorou"
        STABLE = "STABLE", "Estável"
        WORSENED = "WORSENED", "Piorou"

    prefix = "FTE"

    plan = models.ForeignKey(
        RehabilitationTreatmentPlan,
        verbose_name="Plano",
        on_delete=models.CASCADE,
        related_name="progress_notes",
        db_index=True,
    )
    session = models.ForeignKey(
        RehabilitationSession,
        verbose_name="Sessão",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="progress_notes",
    )
    recorded_at = models.DateTimeField("Registada em", default=timezone.now, db_index=True)
    trend = models.CharField("Tendência", max_length=16, choices=Trend.choices, default=Trend.STABLE, db_index=True)
    functional_score = models.PositiveSmallIntegerField("Pontuação funcional (0-10)", default=0, validators=SCORE_VALIDATORS)
    pain_score = models.PositiveSmallIntegerField("Dor (0-10)", default=0, validators=SCORE_VALIDATORS)
    progress_percent = models.DecimalField("Progresso observado (%)", max_digits=5, decimal_places=2, default=ZERO, validators=PERCENT_VALIDATORS)
    summary = models.TextField("Resumo da evolução")
    recommendations = models.TextField("Recomendações", blank=True, default="")

    class Meta:
        db_table = "fisioterapia_evolucao"
        verbose_name = "Evolução de Reabilitação"
        verbose_name_plural = "Evoluções de Reabilitação"
        ordering = ["-recorded_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "plan", "recorded_at"]),
            models.Index(fields=["tenant", "session"]),
            models.Index(fields=["tenant", "trend"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "plan")
        _validate_same_tenant(self, "session")
        if self.session_id and self.session and self.plan_id and self.session.plan_id != self.plan_id:
            raise ValidationError({"session": "A evolução deve pertencer a uma sessão do mesmo plano."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "plan")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Evolução {self.pk}"


class RehabilitationDeviceUsage(NoNameCoreModel):
    prefix = "FTU"

    session = models.ForeignKey(
        RehabilitationSession,
        verbose_name="Sessão",
        on_delete=models.CASCADE,
        related_name="device_usages",
        db_index=True,
    )
    device = models.ForeignKey(
        PhysiotherapyDevice,
        verbose_name="Aparelho",
        on_delete=models.PROTECT,
        related_name="rehabilitation_usages",
        db_index=True,
    )
    started_at = models.DateTimeField("Iniciado em", null=True, blank=True)
    ended_at = models.DateTimeField("Terminado em", null=True, blank=True)
    duration_minutes = models.PositiveSmallIntegerField("Duração (min)", default=0)
    settings = models.CharField("Configuração", max_length=180, blank=True, default="")
    outcome = models.TextField("Resultado", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "fisioterapia_aparelho_uso"
        verbose_name = "Uso de Aparelho"
        verbose_name_plural = "Usos de Aparelhos"
        ordering = ["-started_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "session"]),
            models.Index(fields=["tenant", "device"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "session")
        _validate_same_tenant(self, "device")
        if self.ended_at and self.started_at and self.ended_at < self.started_at:
            raise ValidationError({"ended_at": "O fim não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "session")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Uso de aparelho {self.pk}"


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


def _validate_prescription_patient_match(plan: RehabilitationTreatmentPlan) -> None:
    if not plan.prescription_item_id or not plan.patient_id:
        return
    prescription = plan.prescription_item
    record = getattr(prescription, "record", None)
    if record is not None and getattr(record, "patient_id", None) != plan.patient_id:
        raise ValidationError({"prescription_item": "A prescrição médica deve pertencer ao paciente do plano."})
