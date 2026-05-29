from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.mixins.model.position import ScopedPositionMixin
from core.models.base import CoreModel, NoNameCoreModel

ZERO = Decimal("0.00")
PERCENT_VALIDATORS = [MinValueValidator(Decimal("0.00")), MaxValueValidator(Decimal("100.00"))]
SCORE_VALIDATORS = [MinValueValidator(0), MaxValueValidator(10)]


class TherapyDiscipline(models.TextChoices):
    OCCUPATIONAL_THERAPY = "OCCUPATIONAL_THERAPY", "Terapia ocupacional"
    SPECIALIZED_PHYSIOTHERAPY = "SPECIALIZED_PHYSIOTHERAPY", "Fisioterapia especializada"
    SPEECH_THERAPY = "SPEECH_THERAPY", "Fonoaudiologia"
    NEUROREHABILITATION = "NEUROREHABILITATION", "Neurorreabilitação"
    RESPIRATORY_THERAPY = "RESPIRATORY_THERAPY", "Terapia respiratória"
    OTHER = "OTHER", "Outra"


class TherapyDomain(models.TextChoices):
    MOTOR = "MOTOR", "Motora"
    COORDINATION = "COORDINATION", "Coordenação"
    SENSORY = "SENSORY", "Sensorial"
    COGNITION = "COGNITION", "Cognição"
    COMMUNICATION = "COMMUNICATION", "Comunicação"
    SWALLOWING = "SWALLOWING", "Deglutição"
    ACTIVITIES_DAILY_LIVING = "ACTIVITIES_DAILY_LIVING", "Atividades da vida diária"
    WORK_ADAPTATION = "WORK_ADAPTATION", "Adaptação laboral"
    GLOBAL_FUNCTION = "GLOBAL_FUNCTION", "Função global"
    OTHER = "OTHER", "Outra"


class TherapeuticResource(CoreModel):
    class ResourceType(models.TextChoices):
        DEVICE = "DEVICE", "Aparelho"
        ASSISTIVE_TECHNOLOGY = "ASSISTIVE_TECHNOLOGY", "Tecnologia assistiva"
        ORTHOSIS = "ORTHOSIS", "Órtese"
        EXERCISE_MATERIAL = "EXERCISE_MATERIAL", "Material terapêutico"
        COMMUNICATION_AID = "COMMUNICATION_AID", "Apoio de comunicação"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Ativo"
        MAINTENANCE = "MAINTENANCE", "Em manutenção"
        INACTIVE = "INACTIVE", "Inativo"

    prefix = "TER"

    code = models.CharField("Código", max_length=40, db_index=True)
    resource_type = models.CharField("Tipo de recurso", max_length=32, choices=ResourceType.choices, default=ResourceType.EXERCISE_MATERIAL, db_index=True)
    discipline = models.CharField("Disciplina", max_length=32, choices=TherapyDiscipline.choices, default=TherapyDiscipline.OCCUPATIONAL_THERAPY, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    manufacturer = models.CharField("Fabricante", max_length=120, blank=True, default="")
    model = models.CharField("Modelo", max_length=120, blank=True, default="")
    serial_number = models.CharField("Número de série", max_length=80, blank=True, default="", db_index=True)
    location = models.CharField("Localização", max_length=120, blank=True, default="")
    next_review = models.DateField("Próxima revisão", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "terapia_recurso"
        verbose_name = "Recurso Terapêutico"
        verbose_name_plural = "Recursos Terapêuticos"
        ordering = ["name", "code"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uq_therapy_resource_code_tenant"),
            models.UniqueConstraint(
                fields=["tenant", "serial_number"],
                condition=~models.Q(serial_number=""),
                name="uq_therapy_resource_serial_tenant",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "discipline"]),
            models.Index(fields=["tenant", "resource_type"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class TherapyEvaluation(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        ACTIVE = "ACTIVE", "Ativa"
        FINALIZED = "FINALIZED", "Finalizada"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "TEV"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="therapy_evaluations",
        db_index=True,
    )
    therapist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Terapeuta",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="therapy_evaluations",
        db_index=True,
    )
    consultation = models.ForeignKey(
        "consultas.MedicalConsultation",
        verbose_name="Consulta associada",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="therapy_evaluations",
    )
    medical_record = models.ForeignKey(
        "prontuario.MedicalRecordEntry",
        verbose_name="Cardex/Prontuário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="therapy_evaluations",
    )
    prescription_item = models.ForeignKey(
        "prontuario.PrescriptionItem",
        verbose_name="Item de prescrição médica",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="therapy_evaluations",
    )
    discipline = models.CharField("Disciplina", max_length=32, choices=TherapyDiscipline.choices, default=TherapyDiscipline.OCCUPATIONAL_THERAPY, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    evaluated_at = models.DateTimeField("Avaliada em", default=timezone.now, db_index=True)
    referral_reason = models.TextField("Motivo de encaminhamento", blank=True, default="")
    clinical_diagnosis = models.TextField("Diagnóstico clínico", blank=True, default="")
    functional_diagnosis = models.TextField("Diagnóstico funcional", blank=True, default="")
    outcome_measure = models.CharField("Instrumento de avaliação", max_length=120, blank=True, default="")
    motor_score = models.PositiveSmallIntegerField("Motricidade (0-10)", default=0, validators=SCORE_VALIDATORS)
    coordination_score = models.PositiveSmallIntegerField("Coordenação (0-10)", default=0, validators=SCORE_VALIDATORS)
    sensory_score = models.PositiveSmallIntegerField("Sensorial (0-10)", default=0, validators=SCORE_VALIDATORS)
    cognition_score = models.PositiveSmallIntegerField("Cognição (0-10)", default=0, validators=SCORE_VALIDATORS)
    communication_score = models.PositiveSmallIntegerField("Comunicação (0-10)", default=0, validators=SCORE_VALIDATORS)
    activities_daily_living_score = models.PositiveSmallIntegerField("AVD (0-10)", default=0, validators=SCORE_VALIDATORS)
    limitations = models.TextField("Limitações funcionais", blank=True, default="")
    goals = models.TextField("Objetivos terapêuticos", blank=True, default="")
    recommendations = models.TextField("Recomendações", blank=True, default="")
    precautions = models.TextField("Precauções/contraindicações", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "terapia_avaliacao"
        verbose_name = "Avaliação Terapêutica"
        verbose_name_plural = "Avaliações Terapêuticas"
        ordering = ["-evaluated_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "evaluated_at"]),
            models.Index(fields=["tenant", "therapist", "evaluated_at"]),
            models.Index(fields=["tenant", "discipline", "status"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "therapist")
        _validate_same_tenant(self, "consultation")
        _validate_same_tenant(self, "medical_record")
        _validate_same_tenant(self, "prescription_item")
        _validate_patient_match(self, "consultation")
        _validate_patient_match(self, "medical_record")
        _validate_prescription_patient_match(self)

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Avaliação terapêutica {self.pk}"


class TherapyTreatmentPlan(CoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        ACTIVE = "ACTIVE", "Ativo"
        PAUSED = "PAUSED", "Pausado"
        COMPLETED = "COMPLETED", "Concluído"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "TTP"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="therapy_treatment_plans",
        db_index=True,
    )
    therapist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Terapeuta responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="therapy_treatment_plans",
        db_index=True,
    )
    evaluation = models.ForeignKey(
        TherapyEvaluation,
        verbose_name="Avaliação",
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
        related_name="therapy_treatment_plans",
    )
    prescription_item = models.ForeignKey(
        "prontuario.PrescriptionItem",
        verbose_name="Item de prescrição médica",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="therapy_treatment_plans",
    )
    discipline = models.CharField("Disciplina", max_length=32, choices=TherapyDiscipline.choices, default=TherapyDiscipline.OCCUPATIONAL_THERAPY, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    start_date = models.DateField("Data de início", default=timezone.localdate, db_index=True)
    end_date = models.DateField("Data de fim", null=True, blank=True, db_index=True)
    frequency_per_week = models.PositiveSmallIntegerField("Sessões por semana", default=1, validators=[MinValueValidator(1)])
    planned_sessions = models.PositiveSmallIntegerField("Sessões planeadas", default=1, validators=[MinValueValidator(1)])
    completed_sessions = models.PositiveSmallIntegerField("Sessões realizadas", default=0)
    progress_percent = models.DecimalField("Progresso (%)", max_digits=5, decimal_places=2, default=ZERO, validators=PERCENT_VALIDATORS)
    objectives = models.TextField("Objetivos", blank=True, default="")
    intervention_strategy = models.TextField("Estratégia de intervenção", blank=True, default="")
    home_program = models.TextField("Programa domiciliar", blank=True, default="")
    assistive_technology = models.TextField("Tecnologia assistiva/adaptações", blank=True, default="")
    prescription_notes = models.TextField("Notas da prescrição", blank=True, default="")
    precautions = models.TextField("Precauções", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "terapia_plano_tratamento"
        verbose_name = "Plano Terapêutico Individualizado"
        verbose_name_plural = "Planos Terapêuticos Individualizados"
        ordering = ["-start_date", "name"]
        indexes = [
            models.Index(fields=["tenant", "patient", "start_date"]),
            models.Index(fields=["tenant", "therapist", "start_date"]),
            models.Index(fields=["tenant", "discipline", "status"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "therapist")
        _validate_same_tenant(self, "evaluation")
        _validate_same_tenant(self, "medical_record")
        _validate_same_tenant(self, "prescription_item")
        _validate_patient_match(self, "evaluation")
        _validate_patient_match(self, "medical_record")
        _validate_prescription_patient_match(self)
        if self.evaluation_id and self.discipline != self.evaluation.discipline:
            raise ValidationError({"evaluation": "A avaliação deve pertencer à mesma disciplina terapêutica."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.evaluation_id and self.discipline == TherapyDiscipline.OCCUPATIONAL_THERAPY:
            self.discipline = self.evaluation.discipline
        self.full_clean()
        return super().save(*args, **kwargs)

    def register_session_completion(self) -> None:
        completed = self.sessions.filter(status=TherapySession.Status.COMPLETED).count()
        planned = max(self.planned_sessions or 1, 1)
        progress = min(Decimal("100.00"), (Decimal(completed) * Decimal("100.00") / Decimal(planned)).quantize(Decimal("0.01")))
        updates: list[str] = []
        if self.completed_sessions != completed:
            self.completed_sessions = completed
            updates.append("completed_sessions")
        if self.progress_percent != progress:
            self.progress_percent = progress
            updates.append("progress_percent")
        if progress >= Decimal("100.00") and self.status == self.Status.ACTIVE:
            self.status = self.Status.COMPLETED
            updates.append("status")
        if updates:
            self.save(update_fields=updates)

    def __str__(self) -> str:
        return self.name


class TherapyPlanGoal(ScopedPositionMixin, NoNameCoreModel):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Aberto"
        IN_PROGRESS = "IN_PROGRESS", "Em progresso"
        ACHIEVED = "ACHIEVED", "Atingido"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "TOG"

    plan = models.ForeignKey(
        TherapyTreatmentPlan,
        verbose_name="Plano",
        on_delete=models.CASCADE,
        related_name="goals",
        db_index=True,
    )
    discipline = models.CharField("Disciplina", max_length=32, choices=TherapyDiscipline.choices, default=TherapyDiscipline.OCCUPATIONAL_THERAPY, db_index=True)
    domain = models.CharField("Domínio", max_length=32, choices=TherapyDomain.choices, default=TherapyDomain.GLOBAL_FUNCTION, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.OPEN, db_index=True)
    description = models.TextField("Objetivo")
    target = models.TextField("Meta mensurável", blank=True, default="")
    baseline_score = models.PositiveSmallIntegerField("Pontuação inicial (0-10)", default=0, validators=SCORE_VALIDATORS)
    target_score = models.PositiveSmallIntegerField("Pontuação alvo (0-10)", default=0, validators=SCORE_VALIDATORS)
    current_score = models.PositiveSmallIntegerField("Pontuação atual (0-10)", default=0, validators=SCORE_VALIDATORS)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "terapia_plano_objetivo"
        verbose_name = "Objetivo Terapêutico"
        verbose_name_plural = "Objetivos Terapêuticos"
        ordering = ["plan", "position", "id"]
        indexes = [
            models.Index(fields=["tenant", "plan", "position"]),
            models.Index(fields=["tenant", "discipline", "status"]),
            models.Index(fields=["tenant", "domain", "status"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "plan")

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "plan")
        if self.plan_id:
            self.discipline = self.plan.discipline
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.description


class TherapySession(NoNameCoreModel):
    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Agendada"
        IN_PROGRESS = "IN_PROGRESS", "Em execução"
        COMPLETED = "COMPLETED", "Concluída"
        MISSED = "MISSED", "Faltou"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "TSS"

    plan = models.ForeignKey(
        TherapyTreatmentPlan,
        verbose_name="Plano",
        on_delete=models.CASCADE,
        related_name="sessions",
        db_index=True,
    )
    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="therapy_sessions",
        db_index=True,
    )
    therapist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Terapeuta",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="therapy_sessions",
        db_index=True,
    )
    discipline = models.CharField("Disciplina", max_length=32, choices=TherapyDiscipline.choices, default=TherapyDiscipline.OCCUPATIONAL_THERAPY, db_index=True)
    scheduled_at = models.DateTimeField("Agendada para", default=timezone.now, db_index=True)
    started_at = models.DateTimeField("Iniciada em", null=True, blank=True)
    ended_at = models.DateTimeField("Terminada em", null=True, blank=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    duration_minutes = models.PositiveSmallIntegerField("Duração (min)", default=0)
    motor_score = models.PositiveSmallIntegerField("Resposta motora (0-10)", default=0, validators=SCORE_VALIDATORS)
    functional_score = models.PositiveSmallIntegerField("Função (0-10)", default=0, validators=SCORE_VALIDATORS)
    communication_score = models.PositiveSmallIntegerField("Comunicação (0-10)", default=0, validators=SCORE_VALIDATORS)
    interventions_performed = models.TextField("Intervenções realizadas", blank=True, default="")
    patient_response = models.TextField("Resposta do paciente", blank=True, default="")
    home_guidance = models.TextField("Orientação domiciliar", blank=True, default="")
    next_steps = models.TextField("Próximos passos", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "terapia_sessao"
        verbose_name = "Sessão Terapêutica"
        verbose_name_plural = "Sessões Terapêuticas"
        ordering = ["-scheduled_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "plan", "scheduled_at"]),
            models.Index(fields=["tenant", "patient", "scheduled_at"]),
            models.Index(fields=["tenant", "therapist", "scheduled_at"]),
            models.Index(fields=["tenant", "discipline", "scheduled_at"]),
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
        if self.plan_id:
            self.discipline = self.plan.discipline
        self.full_clean()
        result = super().save(*args, **kwargs)
        if self.plan_id:
            self.plan.register_session_completion()
        return result

    def __str__(self) -> str:
        return self.custom_id or f"Sessão terapêutica {self.pk}"


class TherapyProgressNote(NoNameCoreModel):
    class Trend(models.TextChoices):
        IMPROVED = "IMPROVED", "Melhorou"
        STABLE = "STABLE", "Estável"
        WORSENED = "WORSENED", "Piorou"

    prefix = "TEX"

    plan = models.ForeignKey(
        TherapyTreatmentPlan,
        verbose_name="Plano",
        on_delete=models.CASCADE,
        related_name="progress_notes",
        db_index=True,
    )
    session = models.ForeignKey(
        TherapySession,
        verbose_name="Sessão",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="progress_notes",
    )
    discipline = models.CharField("Disciplina", max_length=32, choices=TherapyDiscipline.choices, default=TherapyDiscipline.OCCUPATIONAL_THERAPY, db_index=True)
    recorded_at = models.DateTimeField("Registada em", default=timezone.now, db_index=True)
    domain = models.CharField("Domínio", max_length=32, choices=TherapyDomain.choices, default=TherapyDomain.GLOBAL_FUNCTION, db_index=True)
    trend = models.CharField("Tendência", max_length=16, choices=Trend.choices, default=Trend.STABLE, db_index=True)
    functional_score = models.PositiveSmallIntegerField("Função (0-10)", default=0, validators=SCORE_VALIDATORS)
    motor_score = models.PositiveSmallIntegerField("Motricidade (0-10)", default=0, validators=SCORE_VALIDATORS)
    communication_score = models.PositiveSmallIntegerField("Comunicação (0-10)", default=0, validators=SCORE_VALIDATORS)
    progress_percent = models.DecimalField("Progresso observado (%)", max_digits=5, decimal_places=2, default=ZERO, validators=PERCENT_VALIDATORS)
    summary = models.TextField("Resumo da evolução")
    recommendations = models.TextField("Recomendações", blank=True, default="")

    class Meta:
        db_table = "terapia_evolucao"
        verbose_name = "Evolução Terapêutica"
        verbose_name_plural = "Evoluções Terapêuticas"
        ordering = ["-recorded_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "plan", "recorded_at"]),
            models.Index(fields=["tenant", "session"]),
            models.Index(fields=["tenant", "discipline", "recorded_at"]),
            models.Index(fields=["tenant", "domain", "trend"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "plan")
        _validate_same_tenant(self, "session")
        if self.session_id and self.plan_id and self.session.plan_id != self.plan_id:
            raise ValidationError({"session": "A evolução deve pertencer a uma sessão do mesmo plano."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "plan")
        if self.plan_id:
            self.discipline = self.plan.discipline
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Evolução terapêutica {self.pk}"


class TherapyPrescriptionLink(NoNameCoreModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        LINKED = "LINKED", "Ligada ao plano"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    class Priority(models.TextChoices):
        ROUTINE = "ROUTINE", "Rotina"
        URGENT = "URGENT", "Urgente"
        HIGH = "HIGH", "Alta"

    prefix = "TPR"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="therapy_prescription_links",
        db_index=True,
    )
    prescription_item = models.ForeignKey(
        "prontuario.PrescriptionItem",
        verbose_name="Item de prescrição médica",
        on_delete=models.CASCADE,
        related_name="therapy_links",
        db_index=True,
    )
    plan = models.ForeignKey(
        TherapyTreatmentPlan,
        verbose_name="Plano terapêutico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescription_links",
    )
    discipline = models.CharField("Disciplina", max_length=32, choices=TherapyDiscipline.choices, default=TherapyDiscipline.OCCUPATIONAL_THERAPY, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    priority = models.CharField("Prioridade", max_length=16, choices=Priority.choices, default=Priority.ROUTINE, db_index=True)
    requested_service = models.CharField("Serviço prescrito", max_length=180, blank=True, default="")
    requested_sessions = models.PositiveSmallIntegerField("Sessões solicitadas", default=1, validators=[MinValueValidator(1)])
    requested_at = models.DateTimeField("Solicitada em", default=timezone.now, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "terapia_prescricao_ligacao"
        verbose_name = "Ligação de Prescrição Terapêutica"
        verbose_name_plural = "Ligações de Prescrições Terapêuticas"
        ordering = ["-requested_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "requested_at"]),
            models.Index(fields=["tenant", "discipline", "status"]),
            models.Index(fields=["tenant", "priority", "requested_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "prescription_item")
        _validate_same_tenant(self, "plan")
        _validate_prescription_patient_match(self)
        _validate_patient_match(self, "plan")
        if self.plan_id and self.discipline != self.plan.discipline:
            raise ValidationError({"plan": "O plano deve pertencer à mesma disciplina terapêutica."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.plan_id:
            self.status = self.Status.LINKED
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Prescrição terapêutica {self.pk}"


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
