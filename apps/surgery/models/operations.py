from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from core.models.base import CoreModel, NoNameCoreModel

MIN_ZERO = MinValueValidator(Decimal("0.00"))
SCORE_0_10 = [MinValueValidator(0), MaxValueValidator(10)]


class SurgicalRequest(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        REQUESTED = "REQUESTED", "Solicitada"
        UNDER_REVIEW = "UNDER_REVIEW", "Em revisão"
        APPROVED = "APPROVED", "Aprovada"
        REJECTED = "REJECTED", "Rejeitada"
        CANCELLED = "CANCELLED", "Cancelada"
        CONVERTED = "CONVERTED", "Convertida em cirurgia"

    class Priority(models.TextChoices):
        ELECTIVE = "ELECTIVE", "Eletiva"
        URGENT = "URGENT", "Urgente"
        EMERGENCY = "EMERGENCY", "Emergência"

    class RequestedType(models.TextChoices):
        MINOR = "MINOR", "Pequena cirurgia"
        MAJOR = "MAJOR", "Grande cirurgia"
        ELECTIVE = "ELECTIVE", "Eletiva"
        EMERGENCY = "EMERGENCY", "Emergência"
        AMBULATORY = "AMBULATORY", "Ambulatória"
        INPATIENT = "INPATIENT", "Com internamento"
        DAY_SURGERY = "DAY_SURGERY", "Cirurgia de dia"

    prefix = "CPED"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="surgical_requests",
        db_index=True,
    )
    requesting_doctor = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Médico solicitante",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="surgical_requests",
    )
    specialty = models.ForeignKey(
        "consultas.ConsultationSpecialty",
        verbose_name="Especialidade",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="surgical_requests",
    )
    clinical_diagnosis = models.TextField("Diagnóstico clínico", blank=True, default="")
    icd_code = models.CharField("CID/ICD", max_length=24, blank=True, default="", db_index=True)
    requested_surgery_type = models.CharField(
        "Tipo de cirurgia solicitada",
        max_length=24,
        choices=RequestedType.choices,
        default=RequestedType.MAJOR,
        db_index=True,
    )
    requested_procedure = models.CharField("Procedimento solicitado", max_length=180, blank=True, default="")
    priority = models.CharField("Prioridade", max_length=16, choices=Priority.choices, default=Priority.ELECTIVE, db_index=True)
    justification = models.TextField("Justificação", blank=True, default="")
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    reviewed_at = models.DateTimeField("Revisto em", null=True, blank=True, db_index=True)
    converted_at = models.DateTimeField("Convertida em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_pedido_cirurgico"
        verbose_name = "Pedido / Indicação Cirúrgica"
        verbose_name_plural = "Pedidos / Indicações Cirúrgicas"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "created_at"]),
            models.Index(fields=["tenant", "status", "priority"]),
            models.Index(fields=["tenant", "specialty"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "requesting_doctor")
        _validate_same_tenant(self, "specialty")
        if self.status == self.Status.REJECTED and not (self.justification or "").strip():
            raise ValidationError({"justification": "Informe a justificação da rejeição."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.status in {self.Status.APPROVED, self.Status.REJECTED} and not self.reviewed_at:
            self.reviewed_at = timezone.now()
        if self.status == self.Status.CONVERTED and not self.converted_at:
            self.converted_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Pedido cirúrgico {self.pk}"


class PreoperativeAssessment(NoNameCoreModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        IN_PROGRESS = "IN_PROGRESS", "Em curso"
        FIT = "FIT", "Apto para cirurgia"
        TEMPORARILY_UNFIT = "TEMPORARILY_UNFIT", "Temporariamente inapto"
        UNFIT = "UNFIT", "Inapto"
        REQUIRES_EXAMS = "REQUIRES_EXAMS", "Requer exames adicionais"

    class AsaClass(models.TextChoices):
        ASA_I = "ASA_I", "ASA I"
        ASA_II = "ASA_II", "ASA II"
        ASA_III = "ASA_III", "ASA III"
        ASA_IV = "ASA_IV", "ASA IV"
        ASA_V = "ASA_V", "ASA V"
        ASA_VI = "ASA_VI", "ASA VI"
        UNKNOWN = "UNKNOWN", "Não informado"

    prefix = "CPRE"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="preoperative_assessments",
        db_index=True,
    )
    surgical_request = models.ForeignKey(
        SurgicalRequest,
        verbose_name="Pedido cirúrgico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="preoperative_assessments",
    )
    proposed_surgery = models.ForeignKey(
        "cirurgia.Surgery",
        verbose_name="Cirurgia proposta",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="preoperative_assessments",
    )
    evaluator = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Avaliador",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="preoperative_assessments",
    )
    medical_evaluation = models.TextField("Avaliação médica", blank=True, default="")
    anesthetic_evaluation = models.TextField("Avaliação anestésica", blank=True, default="")
    asa_class = models.CharField("Classe ASA", max_length=16, choices=AsaClass.choices, default=AsaClass.UNKNOWN, db_index=True)
    surgical_risk = models.CharField("Risco cirúrgico", max_length=120, blank=True, default="")
    required_exams = models.JSONField("Exames necessários", default=list, blank=True)
    exam_results_reviewed = models.BooleanField("Exames revistos", default=False, db_index=True)
    fit_for_surgery = models.BooleanField("Apto para cirurgia", default=False, db_index=True)
    consent_signed = models.BooleanField("Consentimento assinado", default=False, db_index=True)
    assessed_at = models.DateTimeField("Avaliado em", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.PENDING, db_index=True)
    observations = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_avaliacao_pre_operatoria"
        verbose_name = "Avaliação Pré-operatória"
        verbose_name_plural = "Avaliações Pré-operatórias"
        ordering = ["-assessed_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "surgical_request"]),
            models.Index(fields=["tenant", "proposed_surgery"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "surgical_request")
        _validate_same_tenant(self, "proposed_surgery")
        _validate_same_tenant(self, "evaluator")
        if self.surgical_request_id and self.patient_id != self.surgical_request.patient_id:
            raise ValidationError({"patient": "O paciente deve corresponder ao pedido cirúrgico."})
        if self.proposed_surgery_id and self.patient_id != self.proposed_surgery.patient_id:
            raise ValidationError({"patient": "O paciente deve corresponder à cirurgia proposta."})
        if self.fit_for_surgery and self.status not in {self.Status.FIT, self.Status.IN_PROGRESS}:
            raise ValidationError({"status": "Use o estado 'Apto para cirurgia' quando marcar aptidão cirúrgica."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "patient")
        if self.status == self.Status.FIT:
            self.fit_for_surgery = True
        if self.status in {self.Status.FIT, self.Status.TEMPORARILY_UNFIT, self.Status.UNFIT} and not self.assessed_at:
            self.assessed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Avaliação pré-operatória {self.pk}"


class OperatingRoom(CoreModel):
    class RoomType(models.TextChoices):
        GENERAL = "GENERAL", "Geral"
        MINOR = "MINOR", "Sala de pequena cirurgia"
        OPERATING_ROOM = "OPERATING_ROOM", "Sala operatória"
        MAJOR = "MAJOR", "Grande cirurgia"
        ENDOSCOPY = "ENDOSCOPY", "Endoscopia"
        DELIVERY_OR = "DELIVERY_OR", "Bloco de parto"
        OBSTETRIC = "OBSTETRIC", "Obstétrica"
        EMERGENCY_OR = "EMERGENCY_OR", "Sala de urgência"
        HYBRID = "HYBRID", "Sala híbrida"
        OTHER = "OTHER", "Outra"

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", "Disponível"
        RESERVED = "RESERVED", "Reservada"
        OCCUPIED = "OCCUPIED", "Ocupada"
        IN_USE = "IN_USE", "Em uso"
        CLEANING = "CLEANING", "Em limpeza"
        MAINTENANCE = "MAINTENANCE", "Manutenção"
        BLOCKED = "BLOCKED", "Bloqueada"
        INACTIVE = "INACTIVE", "Inativa"

    prefix = "CCO"

    code = models.CharField("Código", max_length=40, db_index=True)
    room_type = models.CharField("Tipo de sala", max_length=20, choices=RoomType.choices, default=RoomType.GENERAL, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.AVAILABLE, db_index=True)
    location = models.CharField("Localização", max_length=120, blank=True, default="")
    capacity = models.PositiveSmallIntegerField("Capacidade", default=1, validators=[MinValueValidator(1)])
    sterile = models.BooleanField("Esterilizada", default=True, db_index=True)
    equipment_notes = models.TextField("Equipamentos disponíveis", blank=True, default="")
    working_hours = models.JSONField("Horário de funcionamento", default=dict, blank=True)
    cleaning_class = models.CharField("Classe de limpeza", max_length=80, blank=True, default="")
    blocked_reason = models.TextField("Motivo de bloqueio", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_centro_cirurgico"
        verbose_name = "Centro Cirúrgico / Sala Operatória"
        verbose_name_plural = "Centros Cirúrgicos / Salas Operatórias"
        ordering = ["name", "code"]
        constraints = [models.UniqueConstraint(fields=["tenant", "code"], name="uq_operating_room_code_tenant")]
        indexes = [models.Index(fields=["tenant", "status"]), models.Index(fields=["tenant", "room_type"])]

    def clean(self):
        super().clean()
        if self.status == self.Status.BLOCKED and not (self.blocked_reason or "").strip():
            raise ValidationError({"blocked_reason": "Informe o motivo de bloqueio da sala."})

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class SurgicalSchedule(NoNameCoreModel):
    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitada"
        SCHEDULED = "SCHEDULED", "Agendada"
        CONFIRMED = "CONFIRMED", "Confirmada"
        PATIENT_CHECKED_IN = "PATIENT_CHECKED_IN", "Paciente em check-in"
        IN_PREPARATION = "IN_PREPARATION", "Em preparação"
        IN_PROGRESS = "IN_PROGRESS", "Em curso"
        IN_SURGERY = "IN_SURGERY", "Em cirurgia"
        COMPLETED = "COMPLETED", "Concluída"
        POSTPONED = "POSTPONED", "Adiada"
        CANCELLED = "CANCELLED", "Cancelada"
        NO_SHOW = "NO_SHOW", "Falta"

    class Priority(models.TextChoices):
        ELECTIVE = "ELECTIVE", "Eletiva"
        URGENT = "URGENT", "Urgente"
        EMERGENCY = "EMERGENCY", "Emergência"

    prefix = "CAG"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="schedules", db_index=True)
    operating_room = models.ForeignKey(OperatingRoom, verbose_name="Centro cirúrgico", on_delete=models.SET_NULL, null=True, blank=True, related_name="schedules")
    primary_surgeon = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Cirurgião principal",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="primary_surgical_schedules",
    )
    anesthetist = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Anestesista",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="anesthetic_surgical_schedules",
    )
    scheduled_start = models.DateTimeField("Início previsto", default=timezone.now, db_index=True)
    scheduled_end = models.DateTimeField("Fim previsto", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    priority = models.CharField("Prioridade", max_length=16, choices=Priority.choices, default=Priority.ELECTIVE, db_index=True)
    authorization_verified = models.BooleanField("Autorização/pagamento verificado", default=False, db_index=True)
    patient_checked_in_at = models.DateTimeField("Check-in do paciente em", null=True, blank=True, db_index=True)
    cancellation_reason = models.TextField("Motivo de cancelamento", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_agenda_cirurgica"
        verbose_name = "Agenda Cirúrgica"
        verbose_name_plural = "Agenda Cirúrgica"
        ordering = ["-scheduled_start", "-created_at"]
        indexes = [models.Index(fields=["tenant", "surgery", "scheduled_start"]), models.Index(fields=["tenant", "operating_room", "scheduled_start"]), models.Index(fields=["tenant", "status", "priority"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "operating_room")
        _validate_same_tenant(self, "primary_surgeon")
        _validate_same_tenant(self, "anesthetist")
        if self.scheduled_end and self.scheduled_end <= self.scheduled_start:
            raise ValidationError({"scheduled_end": "O fim previsto deve ser posterior ao início."})
        if self.status == self.Status.CANCELLED and not (self.cancellation_reason or "").strip():
            raise ValidationError({"cancellation_reason": "Informe o motivo do cancelamento."})
        if self.status == self.Status.PATIENT_CHECKED_IN and not self.patient_checked_in_at:
            self.patient_checked_in_at = timezone.now()
        if self.scheduled_end:
            self._validate_overlaps()
        if self.status == self.Status.CONFIRMED:
            self._validate_confirmation_release()

    def _active_overlap_statuses(self) -> list[str]:
        return [
            self.Status.REQUESTED,
            self.Status.SCHEDULED,
            self.Status.CONFIRMED,
            self.Status.PATIENT_CHECKED_IN,
            self.Status.IN_PREPARATION,
            self.Status.IN_PROGRESS,
            self.Status.IN_SURGERY,
        ]

    def _overlap_queryset(self):
        if not self.tenant_id or not self.scheduled_end:
            return self.__class__.objects.none()
        queryset = self.__class__.objects.filter(
            tenant_id=self.tenant_id,
            status__in=self._active_overlap_statuses(),
            scheduled_start__lt=self.scheduled_end,
            scheduled_end__gt=self.scheduled_start,
        )
        if self.pk:
            queryset = queryset.exclude(pk=self.pk)
        return queryset

    def _validate_overlaps(self):
        queryset = self._overlap_queryset()
        if self.priority in {self.Priority.URGENT, self.Priority.EMERGENCY}:
            blocking_priorities = [self.Priority.URGENT, self.Priority.EMERGENCY]
        else:
            blocking_priorities = [self.Priority.ELECTIVE, self.Priority.URGENT, self.Priority.EMERGENCY]

        if self.operating_room_id:
            room_conflicts = queryset.filter(operating_room_id=self.operating_room_id, priority__in=blocking_priorities)
            if room_conflicts.exists():
                raise ValidationError({"operating_room": "Já existe cirurgia sobreposta para esta sala."})

        professional_conflict_filters = {}
        if self.primary_surgeon_id:
            professional_conflict_filters["primary_surgeon_id"] = self.primary_surgeon_id
        if self.anesthetist_id:
            professional_conflict_filters["anesthetist_id"] = self.anesthetist_id

        for field, value in professional_conflict_filters.items():
            conflicts = queryset.filter(**{field: value})
            if conflicts.exists():
                raise ValidationError({field.replace("_id", ""): "Já existe agendamento sobreposto para este profissional."})

    def _validate_confirmation_release(self):
        if not self.surgery_id:
            return
        is_elective = self.priority == self.Priority.ELECTIVE and getattr(self.surgery, "priority", "") not in {
            self.Priority.URGENT,
            self.Priority.EMERGENCY,
        }
        estimated_price = getattr(self.surgery, "estimated_price", Decimal("0.00")) or Decimal("0.00")
        if not is_elective or estimated_price <= Decimal("0.00"):
            return
        if self.authorization_verified:
            return
        approved = self.surgery.authorizations.filter(
            status__in=[
                SurgicalAuthorization.Status.APPROVED,
                SurgicalAuthorization.Status.PARTIALLY_APPROVED,
            ],
            budget_approved=True,
        ).filter(
            models.Q(initial_payment_received=True) | models.Q(insurance_authorized=True)
        ).exists()
        if not approved:
            raise ValidationError(
                {
                    "status": "Cirurgia eletiva paga só pode ser confirmada após orçamento aprovado e pagamento/autorização."
                }
            )

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Agenda cirúrgica {self.pk}"


class SurgicalTeamMember(NoNameCoreModel):
    class Role(models.TextChoices):
        MAIN_SURGEON = "MAIN_SURGEON", "Cirurgião principal"
        SURGEON = "SURGEON", "Cirurgião"
        ASSISTANT_SURGEON = "ASSISTANT_SURGEON", "Cirurgião assistente"
        ASSISTANT = "ASSISTANT", "Assistente"
        ANESTHETIST = "ANESTHETIST", "Anestesista"
        SCRUB_NURSE = "SCRUB_NURSE", "Instrumentista"
        CIRCULATING_NURSE = "CIRCULATING_NURSE", "Circulante"
        RECOVERY_NURSE = "RECOVERY_NURSE", "Enfermeiro de recuperação"
        ORDERLY = "ORDERLY", "Maqueiro"
        PERFUSIONIST = "PERFUSIONIST", "Perfusionista"
        OTHER = "OTHER", "Outro"

    prefix = "CEQ"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="team_members", db_index=True)
    employee = models.ForeignKey("recursos_humanos.Employee", verbose_name="Profissional", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_team_assignments")
    role = models.CharField("Função", max_length=24, choices=Role.choices, default=Role.ASSISTANT, db_index=True)
    lead = models.BooleanField("Responsável principal", default=False, db_index=True)
    present = models.BooleanField("Presente", default=True, db_index=True)
    entry_at = models.DateTimeField("Entrada em sala", null=True, blank=True, db_index=True)
    exit_at = models.DateTimeField("Saída de sala", null=True, blank=True, db_index=True)
    responsibility = models.TextField("Responsabilidade", blank=True, default="")
    signed_at = models.DateTimeField("Assinado em", null=True, blank=True, db_index=True)
    signature_reference = models.CharField("Referência de assinatura", max_length=160, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_equipa_cirurgica"
        verbose_name = "Membro da Equipa Cirúrgica"
        verbose_name_plural = "Equipa Cirúrgica"
        ordering = ["surgery", "role", "id"]
        indexes = [models.Index(fields=["tenant", "surgery", "role"]), models.Index(fields=["tenant", "employee"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "employee")
        if self.exit_at and self.entry_at and self.exit_at < self.entry_at:
            raise ValidationError({"exit_at": "A saída não pode ser anterior à entrada."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.role} - {getattr(self.employee, 'name', '') or self.custom_id}"


class AnesthesiaRecord(NoNameCoreModel):
    class AnesthesiaType(models.TextChoices):
        GENERAL = "GENERAL", "Geral"
        REGIONAL = "REGIONAL", "Regional"
        LOCAL = "LOCAL", "Local"
        SEDATION = "SEDATION", "Sedação"
        COMBINED = "COMBINED", "Combinada"
        NONE = "NONE", "Sem anestesia"

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planeada"
        IN_PROGRESS = "IN_PROGRESS", "Em curso"
        COMPLETED = "COMPLETED", "Concluída"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "CAN"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="anesthesia_records", db_index=True)
    anesthetist = models.ForeignKey("recursos_humanos.Employee", verbose_name="Anestesista", on_delete=models.SET_NULL, null=True, blank=True, related_name="anesthesia_records")
    anesthesia_type = models.CharField("Tipo de anestesia", max_length=20, choices=AnesthesiaType.choices, default=AnesthesiaType.GENERAL, db_index=True)
    asa_class = models.CharField("Classe ASA", max_length=8, blank=True, default="", db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.PLANNED, db_index=True)
    induction_at = models.DateTimeField("Indução em", null=True, blank=True, db_index=True)
    started_at = models.DateTimeField("Iniciada em", null=True, blank=True, db_index=True)
    ended_at = models.DateTimeField("Terminada em", null=True, blank=True, db_index=True)
    airway_management = models.CharField("Via aérea", max_length=160, blank=True, default="")
    medications = models.JSONField("Fármacos", default=list, blank=True)
    fluids = models.JSONField("Fluidos", default=list, blank=True)
    vital_signs = models.JSONField("Sinais vitais", default=list, blank=True)
    adverse_events = models.JSONField("Eventos adversos", default=list, blank=True)
    recovery_handoff = models.TextField("Passagem para recuperação", blank=True, default="")
    complications = models.TextField("Complicações", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_anestesia"
        verbose_name = "Registo de Anestesia"
        verbose_name_plural = "Registos de Anestesia"
        ordering = ["-started_at", "-created_at"]
        indexes = [models.Index(fields=["tenant", "surgery"]), models.Index(fields=["tenant", "anesthesia_type", "status"]), models.Index(fields=["tenant", "anesthetist"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "anesthetist")
        if self.started_at and self.induction_at and self.started_at < self.induction_at:
            raise ValidationError({"started_at": "O início não pode ser anterior à indução."})
        if self.ended_at and self.started_at and self.ended_at < self.started_at:
            raise ValidationError({"ended_at": "O fim da anestesia não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Anestesia {self.pk}"


class SurgicalSafetyChecklist(NoNameCoreModel):
    class Phase(models.TextChoices):
        SIGN_IN = "SIGN_IN", "Antes da indução"
        TIME_OUT = "TIME_OUT", "Antes da incisão"
        SIGN_OUT = "SIGN_OUT", "Antes da saída"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED", "Parcialmente concluído"
        COMPLETED = "COMPLETED", "Concluído"
        FAILED = "FAILED", "Falhou"
        OVERRIDDEN = "OVERRIDDEN", "Sobrescrito"

    prefix = "CCK"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="safety_checklists", db_index=True)
    completed_by = models.ForeignKey("recursos_humanos.Employee", verbose_name="Preenchido por", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_checklists_completed")
    phase = models.CharField("Fase", max_length=16, choices=Phase.choices, default=Phase.SIGN_IN, db_index=True)
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.PENDING, db_index=True)
    patient_identity_confirmed = models.BooleanField("Identidade confirmada", default=False)
    procedure_confirmed = models.BooleanField("Procedimento confirmado", default=False)
    site_marked = models.BooleanField("Local marcado", default=False)
    consent_confirmed = models.BooleanField("Consentimento confirmado", default=False)
    anesthesia_safety_checked = models.BooleanField("Segurança anestésica verificada", default=False)
    antibiotic_prophylaxis = models.BooleanField("Profilaxia antibiótica", default=False)
    instrument_count_confirmed = models.BooleanField("Contagem de instrumentos confirmada", default=False)
    specimens_labeled = models.BooleanField("Amostras identificadas", default=False)
    completed_at = models.DateTimeField("Concluído em", null=True, blank=True, db_index=True)
    override_reason = models.TextField("Motivo de sobrescrita", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_checklist_seguranca"
        verbose_name = "Checklist de Segurança Cirúrgica"
        verbose_name_plural = "Checklists de Segurança Cirúrgica"
        ordering = ["surgery", "phase", "created_at"]
        constraints = [models.UniqueConstraint(fields=["tenant", "surgery", "phase"], name="uq_surgery_checklist_phase_tenant")]
        indexes = [models.Index(fields=["tenant", "surgery", "phase"]), models.Index(fields=["tenant", "completed_at"])]

    @property
    def is_complete(self) -> bool:
        return all([
            self.patient_identity_confirmed,
            self.procedure_confirmed,
            self.consent_confirmed,
            self.anesthesia_safety_checked,
        ])

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "completed_by")
        if self.status == self.Status.OVERRIDDEN and not (self.override_reason or "").strip():
            raise ValidationError({"override_reason": "Informe o motivo da sobrescrita do checklist."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        if self.is_complete and self.status in {self.Status.PENDING, self.Status.PARTIALLY_COMPLETED}:
            self.status = self.Status.COMPLETED
        if self.status == self.Status.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.phase} - {self.surgery_id}"


class SurgicalMaterial(CoreModel):
    class MaterialType(models.TextChoices):
        INSTRUMENT = "INSTRUMENT", "Instrumental"
        CONSUMABLE = "CONSUMABLE", "Consumível"
        IMPLANT = "IMPLANT", "Implante"
        MEDICATION = "MEDICATION", "Medicamento"
        STERILE_KIT = "STERILE_KIT", "Kit estéril"
        REUSABLE_EQUIPMENT = "REUSABLE_EQUIPMENT", "Equipamento reutilizável"
        SUTURE = "SUTURE", "Sutura"
        OTHER = "OTHER", "Outro"

    prefix = "CMAT"

    code = models.CharField("Código", max_length=40, db_index=True)
    product = models.ForeignKey("farmacia.Product", verbose_name="Produto de farmácia/stock", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_materials")
    material_type = models.CharField("Tipo de material", max_length=24, choices=MaterialType.choices, default=MaterialType.CONSUMABLE, db_index=True)
    unit = models.CharField("Unidade", max_length=40, default="un", db_index=True)
    internal_code = models.CharField("Código interno", max_length=80, blank=True, default="", db_index=True)
    cost_price = models.DecimalField("Preço de custo", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    sale_price = models.DecimalField("Preço de venda", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    batch_number = models.CharField("Lote padrão", max_length=80, blank=True, default="")
    expiry_date = models.DateField("Validade padrão", null=True, blank=True, db_index=True)
    implantable = models.BooleanField("Implantável", default=False, db_index=True)
    sterilizable = models.BooleanField("Esterilizável", default=False, db_index=True)
    tracks_lot = models.BooleanField("Controla lote", default=False, db_index=True)
    tracks_expiry = models.BooleanField("Controla validade", default=False, db_index=True)
    reusable = models.BooleanField("Reutilizável", default=False, db_index=True)
    sterile = models.BooleanField("Estéril", default=True, db_index=True)
    active = models.BooleanField("Ativo", default=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_material"
        verbose_name = "Material Cirúrgico"
        verbose_name_plural = "Materiais Cirúrgicos"
        ordering = ["name", "code"]
        constraints = [models.UniqueConstraint(fields=["tenant", "code"], name="uq_surgical_material_code_tenant")]
        indexes = [models.Index(fields=["tenant", "material_type"]), models.Index(fields=["tenant", "active"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "product")
        if self.sale_price and self.cost_price and self.sale_price < self.cost_price:
            raise ValidationError({"sale_price": "O preço de venda não deve ser inferior ao custo."})

    def save(self, *args, **kwargs):
        if self.product_id and not self.tenant_id:
            _propagate_tenant_from(self, "product")
        if self.material_type == self.MaterialType.IMPLANT:
            self.implantable = True
        if self.material_type == self.MaterialType.REUSABLE_EQUIPMENT:
            self.reusable = True
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"


class SurgicalConsumption(NoNameCoreModel):
    class BillingStatus(models.TextChoices):
        NOT_BILLABLE = "NOT_BILLABLE", "Não faturável"
        PENDING = "PENDING", "Pendente"
        BILLABLE = "BILLABLE", "Faturável"
        BILLED = "BILLED", "Faturado"
        ADJUSTED = "ADJUSTED", "Ajustado"

    class MaterialFlowStatus(models.TextChoices):
        RESERVED = "RESERVED", "Reservado"
        PREPARED = "PREPARED", "Preparado"
        SENT_TO_OR = "SENT_TO_OR", "Enviado para sala"
        USED = "USED", "Usado"
        PARTIALLY_USED = "PARTIALLY_USED", "Parcialmente usado"
        RETURNED = "RETURNED", "Devolvido"
        DISCARDED = "DISCARDED", "Descartado"
        STERILIZATION_REQUIRED = "STERILIZATION_REQUIRED", "Esterilização necessária"
        BILLED = "BILLED", "Faturado"

    prefix = "CCS"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="consumptions", db_index=True)
    material = models.ForeignKey(SurgicalMaterial, verbose_name="Material", on_delete=models.SET_NULL, null=True, blank=True, related_name="consumptions")
    product = models.ForeignKey("farmacia.Product", verbose_name="Produto", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_consumptions")
    consumed_by = models.ForeignKey("recursos_humanos.Employee", verbose_name="Consumido/registado por", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_consumptions")
    quantity = models.DecimalField("Quantidade", max_digits=10, decimal_places=2, default=Decimal("1.00"), validators=[MinValueValidator(Decimal("0.01"))])
    unit_cost = models.DecimalField("Custo unitário", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    charged_price = models.DecimalField("Preço cobrado", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    consumed_at = models.DateTimeField("Consumido em", default=timezone.now, db_index=True)
    batch_number = models.CharField("Lote", max_length=80, blank=True, default="")
    expiry_date = models.DateField("Validade", null=True, blank=True, db_index=True)
    material_status = models.CharField("Estado do material", max_length=32, choices=MaterialFlowStatus.choices, default=MaterialFlowStatus.USED, db_index=True)
    billing_status = models.CharField("Estado de faturação", max_length=16, choices=BillingStatus.choices, default=BillingStatus.BILLABLE, db_index=True)
    inventory_deducted = models.BooleanField("Stock baixado", default=False, db_index=True)
    returned_quantity = models.DecimalField("Quantidade devolvida", max_digits=10, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_consumo"
        verbose_name = "Consumo Cirúrgico"
        verbose_name_plural = "Consumos Cirúrgicos"
        ordering = ["-consumed_at", "-created_at"]
        indexes = [models.Index(fields=["tenant", "surgery", "consumed_at"]), models.Index(fields=["tenant", "material"]), models.Index(fields=["tenant", "product"])]

    @property
    def total_cost(self) -> Decimal:
        return (self.quantity or Decimal("0.00")) * (self.unit_cost or Decimal("0.00"))

    @property
    def line_total(self) -> Decimal:
        return (self.quantity or Decimal("0.00")) * (self.charged_price or Decimal("0.00"))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "material")
        _validate_same_tenant(self, "product")
        _validate_same_tenant(self, "consumed_by")
        if not self.material_id and not self.product_id:
            raise ValidationError({"material": "Informe um material cirúrgico ou produto de stock."})
        if self.returned_quantity and self.returned_quantity > self.quantity:
            raise ValidationError({"returned_quantity": "A quantidade devolvida não pode exceder a quantidade consumida."})
        if self.material_id:
            if self.material.tracks_lot and not (self.batch_number or "").strip():
                raise ValidationError({"batch_number": "Informe o lote deste material."})
            if self.material.tracks_expiry and not self.expiry_date:
                raise ValidationError({"expiry_date": "Informe a validade deste material."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        if self.material_id and not self.product_id:
            self.product_id = self.material.product_id
        if self.material_id:
            if not self.unit_cost:
                self.unit_cost = self.material.cost_price or Decimal("0.00")
            if not self.charged_price:
                self.charged_price = self.material.sale_price or self.unit_cost or Decimal("0.00")
            if not self.batch_number:
                self.batch_number = self.material.batch_number
            if not self.expiry_date:
                self.expiry_date = self.material.expiry_date
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Consumo {self.pk}"


class RecoveryRecord(NoNameCoreModel):
    class Status(models.TextChoices):
        WAITING_PATIENT = "WAITING_PATIENT", "Aguardando paciente"
        ADMITTED = "ADMITTED", "Admitido"
        MONITORING = "MONITORING", "Em vigilância"
        STABLE = "STABLE", "Estável"
        UNSTABLE = "UNSTABLE", "Instável"
        READY_DISCHARGE = "READY_DISCHARGE", "Alta preparada"
        DISCHARGED = "DISCHARGED", "Alta"
        TRANSFERRED_WARD = "TRANSFERRED_WARD", "Transferido para enfermaria"
        TRANSFERRED_ICU = "TRANSFERRED_ICU", "Transferido para UCI"
        TRANSFERRED = "TRANSFERRED", "Transferido"
        CLOSED = "CLOSED", "Fechado"

    prefix = "CREC"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="recovery_records", db_index=True)
    nurse = models.ForeignKey("recursos_humanos.Employee", verbose_name="Enfermeiro", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_recovery_records")
    admitted_at = models.DateTimeField("Admitido em", default=timezone.now, db_index=True)
    discharged_at = models.DateTimeField("Alta em", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.ADMITTED, db_index=True)
    consciousness_level = models.CharField("Nível de consciência", max_length=120, blank=True, default="")
    pain_score = models.PositiveSmallIntegerField("Dor (0-10)", default=0, validators=SCORE_0_10)
    aldrete_score = models.PositiveSmallIntegerField("Índice de Aldrete", default=0, validators=[MinValueValidator(0), MaxValueValidator(10)])
    vital_signs = models.JSONField("Sinais vitais", default=dict, blank=True)
    nausea_vomiting = models.BooleanField("Náuseas/vómitos", default=False, db_index=True)
    bleeding = models.BooleanField("Sangramento", default=False, db_index=True)
    complications = models.TextField("Complicações", blank=True, default="")
    destination = models.CharField("Destino", max_length=120, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_recuperacao"
        verbose_name = "Recuperação Pós-Anestésica"
        verbose_name_plural = "Recuperação Pós-Anestésica"
        ordering = ["-admitted_at", "-created_at"]
        indexes = [models.Index(fields=["tenant", "surgery"]), models.Index(fields=["tenant", "status", "admitted_at"]), models.Index(fields=["tenant", "nurse"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "nurse")
        if self.discharged_at and self.discharged_at < self.admitted_at:
            raise ValidationError({"discharged_at": "A alta não pode ser anterior à admissão."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        if self.status == self.Status.DISCHARGED and not self.discharged_at:
            self.discharged_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Recuperação {self.pk}"


class OperativeReport(NoNameCoreModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        PENDING_REVIEW = "PENDING_REVIEW", "Pendente de revisão"
        SIGNED = "SIGNED", "Assinado"
        FINAL = "FINAL", "Final"
        AMENDED = "AMENDED", "Retificado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "CRO"

    surgery = models.OneToOneField("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="operative_report", db_index=True)
    primary_surgeon = models.ForeignKey("recursos_humanos.Employee", verbose_name="Cirurgião principal", on_delete=models.SET_NULL, null=True, blank=True, related_name="operative_reports")
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    preoperative_diagnosis = models.TextField("Diagnóstico pré-operatório", blank=True, default="")
    postoperative_diagnosis = models.TextField("Diagnóstico pós-operatório", blank=True, default="")
    procedure_performed = models.TextField("Procedimento realizado", blank=True, default="")
    findings = models.TextField("Achados operatórios", blank=True, default="")
    technique = models.TextField("Técnica cirúrgica", blank=True, default="")
    complications = models.TextField("Complicações", blank=True, default="")
    estimated_blood_loss_ml = models.PositiveIntegerField("Perda sanguínea estimada (ml)", default=0)
    specimens = models.TextField("Amostras", blank=True, default="")
    drains = models.TextField("Drenos", blank=True, default="")
    implants = models.TextField("Implantes", blank=True, default="")
    final_patient_condition = models.TextField("Condição final do paciente", blank=True, default="")
    postoperative_plan = models.TextField("Plano pós-operatório", blank=True, default="")
    specimen_sent_to_pathology = models.BooleanField("Amostra enviada para patologia", default=False, db_index=True)
    pathology_accession_number = models.CharField("Número de patologia", max_length=80, blank=True, default="")
    started_at = models.DateTimeField("Iniciada em", null=True, blank=True, db_index=True)
    ended_at = models.DateTimeField("Terminada em", null=True, blank=True, db_index=True)
    signed_at = models.DateTimeField("Assinado em", null=True, blank=True, db_index=True)
    digitally_signed = models.BooleanField("Assinado digitalmente", default=False, db_index=True)
    digital_signature_reference = models.CharField("Referência de assinatura digital", max_length=160, blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_relatorio_operatorio"
        verbose_name = "Relatório Operatório"
        verbose_name_plural = "Relatórios Operatórios"
        ordering = ["-signed_at", "-created_at"]
        indexes = [models.Index(fields=["tenant", "status"]), models.Index(fields=["tenant", "primary_surgeon", "signed_at"])]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "primary_surgeon")
        if self.ended_at and self.started_at and self.ended_at < self.started_at:
            raise ValidationError({"ended_at": "O fim não pode ser anterior ao início."})
        if self.status in {self.Status.SIGNED, self.Status.FINAL, self.Status.AMENDED} and not (self.procedure_performed or "").strip():
            raise ValidationError({"procedure_performed": "Informe o procedimento realizado antes de finalizar."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        if self.status in {self.Status.SIGNED, self.Status.FINAL, self.Status.AMENDED} and not self.signed_at:
            self.signed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Relatório operatório {self.pk}"


class SurgeryProcedureItem(NoNameCoreModel):
    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planeado"
        CONFIRMED = "CONFIRMED", "Confirmado"
        STARTED = "STARTED", "Iniciado"
        COMPLETED = "COMPLETED", "Concluído"
        CANCELLED = "CANCELLED", "Cancelado"
        CONVERTED = "CONVERTED", "Convertido"
        FAILED = "FAILED", "Falhou"
        REQUIRES_FOLLOW_UP = "REQUIRES_FOLLOW_UP", "Requer seguimento"

    class Laterality(models.TextChoices):
        NOT_APPLICABLE = "NA", "Não aplicável"
        LEFT = "LEFT", "Esquerda"
        RIGHT = "RIGHT", "Direita"
        BILATERAL = "BILATERAL", "Bilateral"
        MIDLINE = "MIDLINE", "Linha média"

    prefix = "CPROC"

    surgery = models.ForeignKey(
        "cirurgia.Surgery",
        verbose_name="Cirurgia",
        on_delete=models.CASCADE,
        related_name="procedure_items",
        db_index=True,
    )
    procedure = models.ForeignKey(
        "cirurgia.SurgicalProcedure",
        verbose_name="Procedimento do catálogo",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="surgery_items",
    )
    description = models.CharField("Descrição", max_length=180, blank=True, default="")
    anatomical_region = models.CharField("Região anatómica", max_length=120, blank=True, default="")
    laterality = models.CharField("Lateralidade", max_length=16, choices=Laterality.choices, default=Laterality.NOT_APPLICABLE, db_index=True)
    sequence = models.PositiveSmallIntegerField("Ordem", default=1, validators=[MinValueValidator(1)])
    responsible_surgeon = models.ForeignKey(
        "recursos_humanos.Employee",
        verbose_name="Cirurgião responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="surgical_procedure_items",
    )
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.PLANNED, db_index=True)
    quantity = models.DecimalField("Quantidade", max_digits=10, decimal_places=2, default=Decimal("1.00"), validators=[MinValueValidator(Decimal("0.01"))])
    unit_price = models.DecimalField("Preço unitário", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    vat_percentage = models.DecimalField("IVA (%)", max_digits=5, decimal_places=2, default=Decimal("16.00"), validators=[MIN_ZERO])
    applies_vat = models.BooleanField("Aplicar IVA", default=True)
    started_at = models.DateTimeField("Iniciado em", null=True, blank=True, db_index=True)
    ended_at = models.DateTimeField("Concluído em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_procedimento_item"
        verbose_name = "Procedimento Realizado na Cirurgia"
        verbose_name_plural = "Procedimentos Realizados na Cirurgia"
        ordering = ["surgery", "sequence", "id"]
        indexes = [
            models.Index(fields=["tenant", "surgery", "status"]),
            models.Index(fields=["tenant", "procedure"]),
            models.Index(fields=["tenant", "responsible_surgeon"]),
        ]

    @property
    def line_total(self) -> Decimal:
        return (self.quantity or Decimal("0.00")) * (self.unit_price or Decimal("0.00"))

    @property
    def total_with_vat(self) -> Decimal:
        if not self.applies_vat:
            return self.line_total
        return self.line_total + (self.line_total * ((self.vat_percentage or Decimal("0.00")) / Decimal("100.00")))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "procedure")
        _validate_same_tenant(self, "responsible_surgeon")
        if not self.procedure_id and not (self.description or "").strip():
            raise ValidationError({"description": "Informe o procedimento realizado ou selecione um procedimento do catálogo."})
        if self.ended_at and self.started_at and self.ended_at < self.started_at:
            raise ValidationError({"ended_at": "O fim não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        if self.procedure_id:
            if not (self.description or "").strip():
                self.description = self.procedure.name
            if not self.unit_price:
                self.unit_price = self.procedure.base_price or Decimal("0.00")
            if self.vat_percentage is None:
                self.vat_percentage = self.procedure.vat_percentage or Decimal("0.00")
            self.applies_vat = self.procedure.applies_vat_by_default
        if self.status == self.Status.STARTED and not self.started_at:
            self.started_at = timezone.now()
        if self.status == self.Status.COMPLETED and not self.ended_at:
            self.ended_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Procedimento cirúrgico {self.pk}"


class SurgicalAuthorization(NoNameCoreModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        APPROVED = "APPROVED", "Aprovada"
        PARTIALLY_APPROVED = "PARTIALLY_APPROVED", "Parcialmente aprovada"
        REJECTED = "REJECTED", "Rejeitada"
        EXPIRED = "EXPIRED", "Expirada"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "CAUT"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="surgical_authorizations",
        db_index=True,
    )
    surgery = models.ForeignKey(
        "cirurgia.Surgery",
        verbose_name="Cirurgia",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="authorizations",
    )
    surgical_request = models.ForeignKey(
        SurgicalRequest,
        verbose_name="Pedido cirúrgico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authorizations",
    )
    preoperative_assessment = models.ForeignKey(
        PreoperativeAssessment,
        verbose_name="Avaliação pré-operatória",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authorizations",
    )
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.PENDING, db_index=True)
    quotation_amount = models.DecimalField("Valor orçamentado", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    approved_amount = models.DecimalField("Valor aprovado", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    initial_payment_amount = models.DecimalField("Pagamento inicial", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    budget_approved = models.BooleanField("Orçamento aprovado", default=False, db_index=True)
    initial_payment_received = models.BooleanField("Pagamento inicial recebido", default=False, db_index=True)
    insurance_authorized = models.BooleanField("Seguro autorizou", default=False, db_index=True)
    special_materials_approved = models.BooleanField("Materiais especiais aprovados", default=False, db_index=True)
    room_available = models.BooleanField("Sala disponível", default=False, db_index=True)
    team_available = models.BooleanField("Equipa disponível", default=False, db_index=True)
    preoperative_assessment_completed = models.BooleanField("Avaliação pré-operatória concluída", default=False, db_index=True)
    consent_signed = models.BooleanField("Consentimento assinado", default=False, db_index=True)
    valid_until = models.DateField("Válida até", null=True, blank=True, db_index=True)
    approved_at = models.DateTimeField("Aprovada em", null=True, blank=True, db_index=True)
    rejected_reason = models.TextField("Motivo de rejeição", blank=True, default="")
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_autorizacao"
        verbose_name = "Autorização Cirúrgica"
        verbose_name_plural = "Autorizações Cirúrgicas"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "status"]),
            models.Index(fields=["tenant", "surgery", "status"]),
            models.Index(fields=["tenant", "surgical_request", "status"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "surgical_request")
        _validate_same_tenant(self, "preoperative_assessment")
        if not self.surgery_id and not self.surgical_request_id:
            raise ValidationError({"surgery": "Informe a cirurgia ou o pedido cirúrgico."})
        if self.surgery_id and self.patient_id != self.surgery.patient_id:
            raise ValidationError({"patient": "O paciente deve corresponder à cirurgia."})
        if self.surgical_request_id and self.patient_id != self.surgical_request.patient_id:
            raise ValidationError({"patient": "O paciente deve corresponder ao pedido cirúrgico."})
        if self.status == self.Status.REJECTED and not (self.rejected_reason or "").strip():
            raise ValidationError({"rejected_reason": "Informe o motivo de rejeição."})
        if self.status == self.Status.APPROVED:
            missing = []
            if not self.budget_approved:
                missing.append("orçamento")
            if not (self.initial_payment_received or self.insurance_authorized):
                missing.append("pagamento inicial ou seguro")
            if not self.preoperative_assessment_completed:
                missing.append("avaliação pré-operatória")
            if not self.consent_signed:
                missing.append("consentimento")
            if missing:
                raise ValidationError({"status": "Autorização aprovada requer: " + ", ".join(missing) + "."})

    def save(self, *args, **kwargs):
        if not self.patient_id:
            if self.surgery_id:
                self.patient = self.surgery.patient
            elif self.surgical_request_id:
                self.patient = self.surgical_request.patient
        _propagate_tenant_from(self, "patient")
        if self.preoperative_assessment_id and self.preoperative_assessment.fit_for_surgery:
            self.preoperative_assessment_completed = True
        if self.status == self.Status.APPROVED and not self.approved_at:
            self.approved_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Autorização cirúrgica {self.pk}"


class SurgicalBillingItem(NoNameCoreModel):
    class EventType(models.TextChoices):
        ROOM_FEE = "ROOM_FEE", "Taxa de sala operatória"
        SURGEON_FEE = "SURGEON_FEE", "Honorário do cirurgião"
        ANESTHETIST_FEE = "ANESTHETIST_FEE", "Honorário do anestesista"
        TEAM_FEE = "TEAM_FEE", "Honorário da equipa"
        SURGICAL_PROCEDURE = "SURGICAL_PROCEDURE", "Procedimento cirúrgico"
        SURGICAL_MATERIAL = "SURGICAL_MATERIAL", "Material cirúrgico"
        IMPLANT = "IMPLANT", "Implante"
        INTRAOPERATIVE_MEDICATION = "INTRAOPERATIVE_MEDICATION", "Medicamento intraoperatório"
        ANESTHESIA = "ANESTHESIA", "Anestesia"
        RECOVERY = "RECOVERY", "Recuperação pós-anestésica"
        INPATIENT_CARE = "INPATIENT_CARE", "Internamento"
        ICU = "ICU", "UCI"
        PREOPERATIVE_EXAM = "PREOPERATIVE_EXAM", "Exame pré-operatório"
        INTRAOPERATIVE_EXAM = "INTRAOPERATIVE_EXAM", "Exame intraoperatório"
        PATHOLOGY_SPECIMEN = "PATHOLOGY_SPECIMEN", "Amostra enviada à patologia"
        ADJUSTMENT = "ADJUSTMENT", "Ajuste"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        READY = "READY", "Pronto para faturar"
        INVOICED = "INVOICED", "Faturado"
        CANCELLED = "CANCELLED", "Cancelado"
        ADJUSTED = "ADJUSTED", "Ajustado"

    class BillingMode(models.TextChoices):
        PACKAGE = "PACKAGE", "Pacote"
        ITEMIZED = "ITEMIZED", "Detalhado"
        HYBRID = "HYBRID", "Híbrido"

    prefix = "CBIL"

    surgery = models.ForeignKey(
        "cirurgia.Surgery",
        verbose_name="Cirurgia",
        on_delete=models.CASCADE,
        related_name="billing_items",
        db_index=True,
    )
    authorization = models.ForeignKey(
        SurgicalAuthorization,
        verbose_name="Autorização",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_items",
    )
    procedure_item = models.ForeignKey(
        SurgeryProcedureItem,
        verbose_name="Procedimento realizado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_items",
    )
    consumption = models.ForeignKey(
        SurgicalConsumption,
        verbose_name="Consumo",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="billing_items",
    )
    invoice = models.ForeignKey(
        "faturamento.Invoice",
        verbose_name="Fatura",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="surgical_billing_items",
    )
    event_type = models.CharField("Evento faturável", max_length=32, choices=EventType.choices, default=EventType.SURGICAL_PROCEDURE, db_index=True)
    billing_mode = models.CharField("Modo de cobrança", max_length=16, choices=BillingMode.choices, default=BillingMode.HYBRID, db_index=True)
    description = models.CharField("Descrição", max_length=255, blank=True, default="")
    quantity = models.DecimalField("Quantidade", max_digits=10, decimal_places=2, default=Decimal("1.00"), validators=[MinValueValidator(Decimal("0.01"))])
    unit_price = models.DecimalField("Preço unitário", max_digits=12, decimal_places=2, default=Decimal("0.00"), validators=[MIN_ZERO])
    vat_percentage = models.DecimalField("IVA (%)", max_digits=5, decimal_places=2, default=Decimal("16.00"), validators=[MIN_ZERO])
    applies_vat = models.BooleanField("Aplicar IVA", default=True)
    billable = models.BooleanField("Faturável", default=True, db_index=True)
    status = models.CharField("Estado", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    billed_at = models.DateTimeField("Faturado em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_faturacao_item"
        verbose_name = "Item de Faturação Cirúrgica"
        verbose_name_plural = "Itens de Faturação Cirúrgica"
        ordering = ["surgery", "event_type", "id"]
        indexes = [
            models.Index(fields=["tenant", "surgery", "status"]),
            models.Index(fields=["tenant", "event_type"]),
            models.Index(fields=["tenant", "invoice"]),
        ]

    @property
    def line_total(self) -> Decimal:
        return (self.quantity or Decimal("0.00")) * (self.unit_price or Decimal("0.00"))

    @property
    def total_with_vat(self) -> Decimal:
        if not self.applies_vat:
            return self.line_total
        return self.line_total + (self.line_total * ((self.vat_percentage or Decimal("0.00")) / Decimal("100.00")))

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "authorization")
        _validate_same_tenant(self, "procedure_item")
        _validate_same_tenant(self, "consumption")
        _validate_same_tenant(self, "invoice")
        if self.authorization_id and self.authorization.surgery_id and self.authorization.surgery_id != self.surgery_id:
            raise ValidationError({"authorization": "A autorização deve pertencer à mesma cirurgia."})
        if self.procedure_item_id and self.procedure_item.surgery_id != self.surgery_id:
            raise ValidationError({"procedure_item": "O procedimento deve pertencer à mesma cirurgia."})
        if self.consumption_id and self.consumption.surgery_id != self.surgery_id:
            raise ValidationError({"consumption": "O consumo deve pertencer à mesma cirurgia."})
        if self.billable and not (self.description or "").strip():
            raise ValidationError({"description": "Descrição é obrigatória para item faturável."})

    def save(self, *args, **kwargs):
        _propagate_tenant_from(self, "surgery")
        if self.procedure_item_id:
            if not (self.description or "").strip():
                self.description = self.procedure_item.description
            if not self.unit_price:
                self.unit_price = self.procedure_item.unit_price
            if self.vat_percentage is None:
                self.vat_percentage = self.procedure_item.vat_percentage
            self.applies_vat = self.procedure_item.applies_vat
        if self.consumption_id:
            if not (self.description or "").strip():
                material = getattr(self.consumption, "material", None)
                product = getattr(self.consumption, "product", None)
                self.description = getattr(material, "name", "") or getattr(product, "name", "") or "Consumo cirúrgico"
            self.quantity = self.consumption.quantity
            if not self.unit_price:
                self.unit_price = self.consumption.charged_price
            if getattr(self.consumption, "material", None) and self.consumption.material.material_type == SurgicalMaterial.MaterialType.IMPLANT:
                self.event_type = self.EventType.IMPLANT
        if self.status == self.Status.INVOICED and not self.billed_at:
            self.billed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Item de faturação cirúrgica {self.pk}"


class SurgicalDocument(NoNameCoreModel):
    class DocumentType(models.TextChoices):
        CONSENT = "CONSENT", "Consentimento"
        QUOTATION = "QUOTATION", "Orçamento"
        AUTHORIZATION = "AUTHORIZATION", "Autorização"
        INSURANCE = "INSURANCE", "Seguro"
        PREOPERATIVE = "PREOPERATIVE", "Pré-operatório"
        ANESTHESIA = "ANESTHESIA", "Anestesia"
        OPERATIVE_REPORT = "OPERATIVE_REPORT", "Relatório operatório"
        DISCHARGE = "DISCHARGE", "Alta"
        OTHER = "OTHER", "Outro"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        PENDING_REVIEW = "PENDING_REVIEW", "Pendente de revisão"
        SIGNED = "SIGNED", "Assinado"
        AMENDED = "AMENDED", "Retificado"
        CANCELLED = "CANCELLED", "Cancelado"

    prefix = "CDOC"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, null=True, blank=True, related_name="documents")
    surgical_request = models.ForeignKey(SurgicalRequest, verbose_name="Pedido cirúrgico", on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    preoperative_assessment = models.ForeignKey(PreoperativeAssessment, verbose_name="Avaliação pré-operatória", on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    authorization = models.ForeignKey(SurgicalAuthorization, verbose_name="Autorização", on_delete=models.SET_NULL, null=True, blank=True, related_name="documents")
    uploaded_by = models.ForeignKey("recursos_humanos.Employee", verbose_name="Carregado por", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_documents")
    title = models.CharField("Título", max_length=160, db_index=True)
    document_type = models.CharField("Tipo de documento", max_length=24, choices=DocumentType.choices, default=DocumentType.OTHER, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    file = models.FileField("Ficheiro", upload_to="surgery/documents/", null=True, blank=True)
    external_reference = models.CharField("Referência externa", max_length=160, blank=True, default="")
    signed_at = models.DateTimeField("Assinado em", null=True, blank=True, db_index=True)
    expires_at = models.DateTimeField("Expira em", null=True, blank=True, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_documento"
        verbose_name = "Documento Cirúrgico"
        verbose_name_plural = "Documentos Cirúrgicos"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "surgery", "document_type"]),
            models.Index(fields=["tenant", "surgical_request", "document_type"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "surgical_request")
        _validate_same_tenant(self, "preoperative_assessment")
        _validate_same_tenant(self, "authorization")
        _validate_same_tenant(self, "uploaded_by")
        if not any([self.surgery_id, self.surgical_request_id, self.preoperative_assessment_id, self.authorization_id]):
            raise ValidationError({"surgery": "Associe o documento a uma cirurgia, pedido, avaliação ou autorização."})
        if self.expires_at and self.signed_at and self.expires_at < self.signed_at:
            raise ValidationError({"expires_at": "A expiração não pode ser anterior à assinatura."})

    def save(self, *args, **kwargs):
        for attr in ("surgery", "surgical_request", "preoperative_assessment", "authorization"):
            _propagate_tenant_from(self, attr)
            if self.tenant_id:
                break
        if self.status == self.Status.SIGNED and not self.signed_at:
            self.signed_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title or self.custom_id or f"Documento cirúrgico {self.pk}"


class SurgicalAuditEvent(NoNameCoreModel):
    class EventType(models.TextChoices):
        STATUS_CHANGE = "STATUS_CHANGE", "Mudança de estado"
        AUTHORIZATION = "AUTHORIZATION", "Autorização"
        ROOM = "ROOM", "Sala"
        TEAM = "TEAM", "Equipa"
        ANESTHESIA = "ANESTHESIA", "Anestesia"
        MATERIAL = "MATERIAL", "Material"
        BILLING = "BILLING", "Faturação"
        DOCUMENT = "DOCUMENT", "Documento"
        SPECIMEN = "SPECIMEN", "Amostra"
        CLINICAL = "CLINICAL", "Clínico"
        ACTION = "ACTION", "Ação"

    prefix = "CAUD"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, null=True, blank=True, related_name="audit_events")
    surgical_request = models.ForeignKey(SurgicalRequest, verbose_name="Pedido cirúrgico", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events")
    actor = models.ForeignKey("recursos_humanos.Employee", verbose_name="Responsável", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_audit_events")
    event_type = models.CharField("Tipo de evento", max_length=24, choices=EventType.choices, default=EventType.ACTION, db_index=True)
    action = models.CharField("Ação", max_length=160, db_index=True)
    previous_state = models.CharField("Estado anterior", max_length=80, blank=True, default="")
    new_state = models.CharField("Novo estado", max_length=80, blank=True, default="")
    metadata = models.JSONField("Metadados", default=dict, blank=True)
    occurred_at = models.DateTimeField("Ocorrido em", default=timezone.now, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_auditoria"
        verbose_name = "Evento de Auditoria Cirúrgica"
        verbose_name_plural = "Eventos de Auditoria Cirúrgica"
        ordering = ["-occurred_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "surgery", "event_type"]),
            models.Index(fields=["tenant", "surgical_request", "event_type"]),
            models.Index(fields=["tenant", "occurred_at"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "surgical_request")
        _validate_same_tenant(self, "actor")
        if not self.surgery_id and not self.surgical_request_id:
            raise ValidationError({"surgery": "Associe o evento à cirurgia ou ao pedido cirúrgico."})

    def save(self, *args, **kwargs):
        for attr in ("surgery", "surgical_request"):
            _propagate_tenant_from(self, attr)
            if self.tenant_id:
                break
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or self.action or f"Auditoria cirúrgica {self.pk}"


class SurgicalSpecimen(NoNameCoreModel):
    class Status(models.TextChoices):
        COLLECTED = "COLLECTED", "Colhida"
        SENT_TO_PATHOLOGY = "SENT_TO_PATHOLOGY", "Enviada para patologia"
        RECEIVED = "RECEIVED", "Recebida"
        REJECTED = "REJECTED", "Rejeitada"
        REPORTED = "REPORTED", "Reportada"
        CANCELLED = "CANCELLED", "Cancelada"

    prefix = "CSPC"

    surgery = models.ForeignKey("cirurgia.Surgery", verbose_name="Cirurgia", on_delete=models.CASCADE, related_name="specimens", db_index=True)
    patient = models.ForeignKey("clinical.Patient", verbose_name="Paciente", on_delete=models.PROTECT, related_name="surgical_specimens", db_index=True)
    specimen_type = models.CharField("Tipo de amostra", max_length=120, db_index=True)
    anatomical_site = models.CharField("Local anatómico", max_length=160, blank=True, default="")
    collected_at = models.DateTimeField("Colhida em", default=timezone.now, db_index=True)
    fixative = models.CharField("Fixador usado", max_length=120, blank=True, default="")
    responsible = models.ForeignKey("recursos_humanos.Employee", verbose_name="Responsável", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_specimens")
    pathology_request = models.ForeignKey("patologia.PathologyRequest", verbose_name="Pedido de patologia", on_delete=models.SET_NULL, null=True, blank=True, related_name="surgical_specimens")
    status = models.CharField("Estado", max_length=24, choices=Status.choices, default=Status.COLLECTED, db_index=True)
    notes = models.TextField("Observações", blank=True, default="")

    class Meta:
        db_table = "cirurgia_amostra"
        verbose_name = "Amostra Cirúrgica"
        verbose_name_plural = "Amostras Cirúrgicas"
        ordering = ["-collected_at", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "surgery", "status"]),
            models.Index(fields=["tenant", "patient", "collected_at"]),
            models.Index(fields=["tenant", "pathology_request"]),
        ]

    def clean(self):
        super().clean()
        _validate_same_tenant(self, "surgery")
        _validate_same_tenant(self, "patient")
        _validate_same_tenant(self, "responsible")
        _validate_same_tenant(self, "pathology_request")
        if self.surgery_id and self.patient_id != self.surgery.patient_id:
            raise ValidationError({"patient": "O paciente deve corresponder à cirurgia."})

    def save(self, *args, **kwargs):
        if not self.patient_id and self.surgery_id:
            self.patient = self.surgery.patient
        _propagate_tenant_from(self, "surgery")
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Amostra cirúrgica {self.pk}"


def _propagate_tenant_from(instance, attr: str) -> None:
    related = getattr(instance, attr, None)
    tenant_id = getattr(related, "tenant_id", None)
    if tenant_id and not instance.tenant_id:
        instance.tenant_id = tenant_id


def _validate_same_tenant(instance, attr: str) -> None:
    related = getattr(instance, attr, None)
    if not related or not instance.tenant_id:
        return
    related_tenant_id = getattr(related, "tenant_id", None)
    if related_tenant_id and related_tenant_id != instance.tenant_id:
        raise ValidationError({attr: "O registo relacionado deve pertencer ao mesmo tenant."})
