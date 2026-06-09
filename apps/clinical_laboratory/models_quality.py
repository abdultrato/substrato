"""Gestão da Qualidade do laboratório (bloco quality_management).

Sistema de qualidade: documentos controlados (incl. SOPs), não conformidades,
ações corretivas/preventivas (CAPA), auditorias internas + achados, indicadores,
formação, competências, reclamações, riscos e revisões pela gestão.

Integra-se com o resto: a não conformidade pode nascer de rejeição de amostra,
falha de QC, reclamação, achado de auditoria ou incidente de exposição.
"""

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel

USER = settings.AUTH_USER_MODEL


class QualityDocument(NoNameCoreModel):
    """Documento controlado do SGQ (manual, SOP, política, formulário, ...)."""

    prefix = "QDOC"

    class DocType(models.TextChoices):
        MANUAL = "MANUAL", "Manual da qualidade"
        SOP = "POP", "Procedimento operacional padrão (SOP)"
        WORK_INSTRUCTION = "INSTRUCAO", "Instrução de trabalho"
        FORM = "FORMULARIO", "Formulário"
        RECORD = "REGISTO", "Registo"
        POLICY = "POLITICA", "Política"
        PLAN = "PLANO", "Plano"
        BIOSAFETY = "PROT_BIO", "Protocolo de biossegurança"

    class Status(models.TextChoices):
        DRAFT = "RASCUNHO", "Rascunho"
        UNDER_REVIEW = "EM_REVISAO", "Em revisão"
        APPROVED = "APROVADO", "Aprovado"
        ACTIVE = "ATIVO", "Ativo"
        OBSOLETE = "OBSOLETO", "Obsoleto"
        ARCHIVED = "ARQUIVADO", "Arquivado"

    code = models.CharField("Código", db_column="code", max_length=40, db_index=True)
    title = models.CharField("Título", db_column="title", max_length=255)
    document_type = models.CharField("Tipo", db_column="document_type", max_length=12,
                                     choices=DocType.choices, default=DocType.SOP, db_index=True)
    sector = models.ForeignKey("laboratorio.LabSector", db_column="sector_id", verbose_name="Sector",
                               on_delete=models.SET_NULL, related_name="quality_documents", null=True, blank=True)
    version = models.CharField("Versão", db_column="version", max_length=20, default="1.0")
    status = models.CharField("Estado", max_length=12, choices=Status.choices,
                              default=Status.DRAFT, db_index=True)
    owner = models.ForeignKey(USER, db_column="owner_id", verbose_name="Responsável",
                              on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    approved_by = models.ForeignKey(USER, db_column="approved_by_id", verbose_name="Aprovado por",
                                    on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    approved_at = models.DateTimeField("Aprovado em", db_column="approved_at", null=True, blank=True)
    effective_date = models.DateField("Data de vigência", db_column="effective_date", null=True, blank=True)
    review_date = models.DateField("Próxima revisão", db_column="review_date", null=True, blank=True, db_index=True)
    content = models.TextField("Conteúdo", db_column="content", blank=True, default="")

    class Meta:
        db_table = "laboratorio_qm_documento"
        verbose_name = "Documento da qualidade"
        verbose_name_plural = "Documentos da qualidade"
        ordering = ["code"]
        indexes = [models.Index(fields=["tenant", "document_type", "status"])]

    def approve(self, *, by=None):
        self.status = self.Status.APPROVED
        self.approved_by = by or self.approved_by
        self.approved_at = timezone.now()
        self.save(update_fields=["status", "approved_by", "approved_at"])

    def is_review_due(self, today=None) -> bool:
        today = today or timezone.localdate()
        return bool(self.review_date and self.review_date <= today)

    def __str__(self) -> str:
        return f"{self.code} - {self.title}"


class Nonconformity(NoNameCoreModel):
    """Não conformidade detetada no laboratório."""

    prefix = "QNC"

    class Source(models.TextChoices):
        SAMPLE_REJECTION = "REJEICAO", "Rejeição de amostra"
        QC_FAILURE = "FALHA_QC", "Falha de controlo de qualidade"
        COMPLAINT = "RECLAMACAO", "Reclamação"
        AUDIT = "AUDITORIA", "Achado de auditoria"
        EXPOSURE = "EXPOSICAO", "Incidente de exposição"
        EQUIPMENT = "EQUIPAMENTO", "Equipamento"
        INTERNAL = "INTERNA", "Deteção interna"
        OTHER = "OUTRA", "Outra"

    class Severity(models.TextChoices):
        MINOR = "MENOR", "Menor"
        MAJOR = "MAIOR", "Maior"
        CRITICAL = "CRITICA", "Crítica"

    class Status(models.TextChoices):
        OPEN = "ABERTA", "Aberta"
        INVESTIGATING = "INVESTIGACAO", "Em investigação"
        ACTION_REQUIRED = "ACAO_REQUERIDA", "Ação requerida"
        CAPA = "CAPA_EM_CURSO", "CAPA em curso"
        PENDING_VERIFICATION = "VERIFICACAO", "Pendente de verificação"
        CLOSED = "FECHADA", "Fechada"
        CANCELLED = "CANCELADA", "Cancelada"

    code = models.CharField("Código", db_column="code", max_length=40, blank=True, default="", db_index=True)
    sector = models.ForeignKey("laboratorio.LabSector", db_column="sector_id", verbose_name="Sector",
                               on_delete=models.SET_NULL, related_name="nonconformities", null=True, blank=True)
    source = models.CharField("Origem", db_column="source", max_length=12,
                              choices=Source.choices, default=Source.INTERNAL, db_index=True)
    source_ref = models.CharField("Referência da origem", db_column="source_ref", max_length=80,
                                  blank=True, default="")
    detected_by = models.ForeignKey(USER, db_column="detected_by_id", verbose_name="Detetada por",
                                    on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    detected_at = models.DateTimeField("Detetada em", db_column="detected_at", default=timezone.now)
    description = models.TextField("Descrição", db_column="description")
    severity = models.CharField("Gravidade", db_column="severity", max_length=8,
                                choices=Severity.choices, default=Severity.MINOR, db_index=True)
    immediate_action = models.TextField("Ação imediata", db_column="immediate_action", blank=True, default="")
    root_cause = models.TextField("Causa raiz", db_column="root_cause", blank=True, default="")
    patient_impact = models.BooleanField("Impacto no paciente", db_column="patient_impact", default=False)
    status = models.CharField("Estado", max_length=16, choices=Status.choices,
                              default=Status.OPEN, db_index=True)

    class Meta:
        db_table = "laboratorio_qm_naoconformidade"
        verbose_name = "Não conformidade"
        verbose_name_plural = "Não conformidades"
        ordering = ["-detected_at"]
        indexes = [models.Index(fields=["tenant", "status", "severity"])]

    def close(self):
        self.status = self.Status.CLOSED
        self.save(update_fields=["status"])

    def __str__(self) -> str:
        return f"{self.code or self.custom_id}: {self.get_severity_display()} ({self.get_status_display()})"


class CorrectiveAction(NoNameCoreModel):
    """Ação corretiva, preventiva ou de melhoria (CAPA)."""

    prefix = "QCA"

    class ActionType(models.TextChoices):
        CORRECTIVE = "CORRETIVA", "Corretiva"
        PREVENTIVE = "PREVENTIVA", "Preventiva"
        IMPROVEMENT = "MELHORIA", "Melhoria"

    class Status(models.TextChoices):
        PLANNED = "PLANEADA", "Planeada"
        IN_PROGRESS = "EM_CURSO", "Em curso"
        COMPLETED = "CONCLUIDA", "Concluída"
        OVERDUE = "ATRASADA", "Atrasada"
        VERIFIED = "VERIFICADA", "Verificada (eficaz)"
        INEFFECTIVE = "INEFICAZ", "Ineficaz"
        CLOSED = "FECHADA", "Fechada"

    nonconformity = models.ForeignKey("laboratorio.Nonconformity", db_column="nonconformity_id",
                                      verbose_name="Não conformidade", on_delete=models.CASCADE,
                                      related_name="actions", null=True, blank=True)
    action_type = models.CharField("Tipo", db_column="action_type", max_length=10,
                                   choices=ActionType.choices, default=ActionType.CORRECTIVE, db_index=True)
    description = models.TextField("Descrição da ação", db_column="description")
    responsible = models.ForeignKey(USER, db_column="responsible_id", verbose_name="Responsável",
                                    on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    due_date = models.DateField("Prazo", db_column="due_date", null=True, blank=True, db_index=True)
    completion_date = models.DateField("Concluída em", db_column="completion_date", null=True, blank=True)
    effectiveness_check = models.TextField("Verificação de eficácia", db_column="effectiveness_check",
                                           blank=True, default="")
    status = models.CharField("Estado", max_length=10, choices=Status.choices,
                              default=Status.PLANNED, db_index=True)

    class Meta:
        db_table = "laboratorio_qm_acao"
        verbose_name = "Ação corretiva/preventiva"
        verbose_name_plural = "Ações corretivas/preventivas"
        ordering = ["due_date"]
        indexes = [models.Index(fields=["tenant", "status", "due_date"])]

    def is_overdue(self, today=None) -> bool:
        today = today or timezone.localdate()
        terminal = (self.Status.COMPLETED, self.Status.VERIFIED, self.Status.CLOSED)
        return bool(self.due_date and self.due_date < today and self.status not in terminal)

    # ------------------------------------------------------------------ #
    # Ciclo CAPA (§40.25): planeada → concluída → verificada/ineficaz → fechada
    # ------------------------------------------------------------------ #
    def complete(self):
        """Marca a ação como concluída (à espera de verificação de eficácia)."""
        if self.status in (self.Status.VERIFIED, self.Status.CLOSED):
            raise ValidationError("Ação já verificada/fechada não pode ser reconcluída.")
        self.status = self.Status.COMPLETED
        self.completion_date = self.completion_date or timezone.localdate()
        self.save(update_fields=["status", "completion_date"])
        return self

    def verify(self, *, effective: bool = True, notes: str = ""):
        """Verifica a eficácia da ação concluída (§40.18/§40.25)."""
        if self.status != self.Status.COMPLETED:
            raise ValidationError("Só ações concluídas podem ter a eficácia verificada.")
        self.status = self.Status.VERIFIED if effective else self.Status.INEFFECTIVE
        if notes:
            self.effectiveness_check = notes
        self.save(update_fields=["status", "effectiveness_check"])
        return self

    def close(self):
        """Fecha a ação (após verificada eficaz, ou administrativamente)."""
        if self.status == self.Status.CLOSED:
            raise ValidationError("Ação já está fechada.")
        self.status = self.Status.CLOSED
        self.save(update_fields=["status"])
        return self

    def __str__(self) -> str:
        return f"{self.get_action_type_display()} ({self.get_status_display()})"


class InternalAudit(NoNameCoreModel):
    """Auditoria interna da qualidade."""

    prefix = "QAUD"

    class Status(models.TextChoices):
        PLANNED = "PLANEADA", "Planeada"
        SCHEDULED = "AGENDADA", "Agendada"
        IN_PROGRESS = "EM_CURSO", "Em curso"
        COMPLETED = "CONCLUIDA", "Concluída"
        FINDINGS_OPEN = "ACHADOS_ABERTOS", "Achados em aberto"
        CLOSED = "FECHADA", "Fechada"

    code = models.CharField("Código", db_column="code", max_length=40, blank=True, default="", db_index=True)
    area = models.CharField("Área auditada", db_column="area", max_length=160)
    auditor = models.ForeignKey(USER, db_column="auditor_id", verbose_name="Auditor",
                                on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    audit_date = models.DateField("Data", db_column="audit_date", default=timezone.localdate, db_index=True)
    scope = models.TextField("Âmbito", db_column="scope", blank=True, default="")
    criteria = models.TextField("Critérios", db_column="criteria", blank=True, default="")
    conclusion = models.TextField("Conclusão", db_column="conclusion", blank=True, default="")
    status = models.CharField("Estado", max_length=16, choices=Status.choices,
                              default=Status.PLANNED, db_index=True)

    class Meta:
        db_table = "laboratorio_qm_auditoria"
        verbose_name = "Auditoria interna"
        verbose_name_plural = "Auditorias internas"
        ordering = ["-audit_date"]
        indexes = [models.Index(fields=["tenant", "status"])]

    def __str__(self) -> str:
        return f"{self.code or self.custom_id} - {self.area}"


class AuditFinding(NoNameCoreModel):
    """Achado de auditoria."""

    prefix = "QAF"

    class FindingType(models.TextChoices):
        CONFORMITY = "CONFORMIDADE", "Conformidade"
        MINOR_NC = "NC_MENOR", "NC menor"
        MAJOR_NC = "NC_MAIOR", "NC maior"
        OBSERVATION = "OBSERVACAO", "Observação"
        IMPROVEMENT = "MELHORIA", "Oportunidade de melhoria"

    audit = models.ForeignKey("laboratorio.InternalAudit", db_column="audit_id", verbose_name="Auditoria",
                              on_delete=models.CASCADE, related_name="findings")
    finding_type = models.CharField("Tipo", db_column="finding_type", max_length=12,
                                    choices=FindingType.choices, default=FindingType.OBSERVATION, db_index=True)
    clause = models.CharField("Cláusula/requisito", db_column="clause", max_length=120, blank=True, default="")
    description = models.TextField("Descrição", db_column="description")
    nonconformity = models.ForeignKey("laboratorio.Nonconformity", db_column="nonconformity_id",
                                      verbose_name="Não conformidade gerada", on_delete=models.SET_NULL,
                                      related_name="audit_findings", null=True, blank=True)

    class Meta:
        db_table = "laboratorio_qm_achado"
        verbose_name = "Achado de auditoria"
        verbose_name_plural = "Achados de auditoria"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "audit", "finding_type"])]

    def __str__(self) -> str:
        return f"{self.get_finding_type_display()} ({self.audit_id})"


class QualityIndicator(NoNameCoreModel):
    """Indicador de qualidade (KPI) do laboratório."""

    prefix = "QKPI"

    class Status(models.TextChoices):
        WITHIN_TARGET = "NA_META", "Dentro da meta"
        WARNING = "ALERTA", "Alerta"
        OUT_OF_TARGET = "FORA_META", "Fora da meta"
        NOT_MEASURED = "NAO_MEDIDO", "Não medido"

    name = models.CharField("Nome", db_column="name", max_length=160)
    formula = models.CharField("Fórmula", db_column="formula", max_length=255, blank=True, default="")
    sector = models.ForeignKey("laboratorio.LabSector", db_column="sector_id", verbose_name="Sector",
                               on_delete=models.SET_NULL, related_name="indicators", null=True, blank=True)
    target_value = models.DecimalField("Meta", db_column="target_value", max_digits=12, decimal_places=2,
                                       null=True, blank=True)
    current_value = models.DecimalField("Valor atual", db_column="current_value", max_digits=12,
                                        decimal_places=2, null=True, blank=True)
    period = models.CharField("Período", db_column="period", max_length=40, blank=True, default="")
    status = models.CharField("Estado", max_length=12, choices=Status.choices,
                              default=Status.NOT_MEASURED, db_index=True)

    class Meta:
        db_table = "laboratorio_qm_indicador"
        verbose_name = "Indicador de qualidade"
        verbose_name_plural = "Indicadores de qualidade"
        ordering = ["name"]
        indexes = [models.Index(fields=["tenant", "status"])]

    def __str__(self) -> str:
        return self.name


class StaffTrainingRecord(NoNameCoreModel):
    """Registo de formação de colaborador do laboratório."""

    prefix = "QTR"

    class Status(models.TextChoices):
        PLANNED = "PLANEADA", "Planeada"
        COMPLETED = "CONCLUIDA", "Concluída"
        EXPIRED = "EXPIRADA", "Expirada"

    staff = models.ForeignKey(USER, db_column="staff_id", verbose_name="Colaborador",
                              on_delete=models.PROTECT, related_name="+")
    title = models.CharField("Formação", db_column="title", max_length=200)
    training_type = models.CharField("Tipo", db_column="training_type", max_length=80, blank=True, default="")
    trainer = models.CharField("Formador", db_column="trainer", max_length=160, blank=True, default="")
    training_date = models.DateField("Data", db_column="training_date", null=True, blank=True)
    expiry_date = models.DateField("Validade", db_column="expiry_date", null=True, blank=True, db_index=True)
    certificate = models.CharField("Certificado", db_column="certificate", max_length=120, blank=True, default="")
    competency_verified = models.BooleanField("Competência verificada", db_column="competency_verified",
                                              default=False)
    status = models.CharField("Estado", max_length=10, choices=Status.choices,
                              default=Status.COMPLETED, db_index=True)

    class Meta:
        db_table = "laboratorio_qm_formacao"
        verbose_name = "Registo de formação"
        verbose_name_plural = "Registos de formação"
        ordering = ["-training_date"]
        indexes = [models.Index(fields=["tenant", "status", "expiry_date"])]

    def is_expired(self, today=None) -> bool:
        today = today or timezone.localdate()
        return bool(self.expiry_date and self.expiry_date < today)

    def __str__(self) -> str:
        return f"{self.title} ({self.staff_id})"


class CompetencyAssessment(NoNameCoreModel):
    """Avaliação de competência técnica de um colaborador."""

    prefix = "QCMP"

    class Status(models.TextChoices):
        SCHEDULED = "AGENDADA", "Agendada"
        ASSESSED = "AVALIADA", "Avaliada"
        COMPETENT = "COMPETENTE", "Competente"
        NEEDS_TRAINING = "NECESSITA_FORMACAO", "Necessita formação"
        RESTRICTED = "RESTRINGIDA", "Restringida"
        EXPIRED = "EXPIRADA", "Expirada"

    staff = models.ForeignKey(USER, db_column="staff_id", verbose_name="Colaborador",
                              on_delete=models.PROTECT, related_name="+")
    area = models.CharField("Atividade/competência", db_column="area", max_length=200)
    related_test = models.ForeignKey("laboratorio.LabTest", db_column="related_test_id", verbose_name="Exame",
                                     on_delete=models.SET_NULL, related_name="competencies", null=True, blank=True)
    assessed_by = models.ForeignKey(USER, db_column="assessed_by_id", verbose_name="Avaliado por",
                                    on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    assessment_date = models.DateField("Data", db_column="assessment_date", null=True, blank=True)
    expiry_date = models.DateField("Validade", db_column="expiry_date", null=True, blank=True, db_index=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices,
                              default=Status.SCHEDULED, db_index=True)
    notes = models.TextField("Notas", db_column="notes", blank=True, default="")

    class Meta:
        db_table = "laboratorio_qm_competencia"
        verbose_name = "Avaliação de competência"
        verbose_name_plural = "Avaliações de competência"
        ordering = ["-assessment_date"]
        indexes = [models.Index(fields=["tenant", "status"])]

    def __str__(self) -> str:
        return f"{self.area} ({self.get_status_display()})"


class CustomerComplaint(NoNameCoreModel):
    """Reclamação de paciente, médico ou sector interno."""

    prefix = "QCC"

    class Status(models.TextChoices):
        RECEIVED = "RECEBIDA", "Recebida"
        INVESTIGATING = "INVESTIGACAO", "Em investigação"
        RESPONDED = "RESPONDIDA", "Respondida"
        CAPA = "CAPA", "Com ação corretiva"
        CLOSED = "FECHADA", "Fechada"

    code = models.CharField("Código", db_column="code", max_length=40, blank=True, default="", db_index=True)
    source = models.CharField("Origem (paciente/médico/sector)", db_column="source", max_length=80,
                              blank=True, default="")
    received_at = models.DateTimeField("Recebida em", db_column="received_at", default=timezone.now)
    description = models.TextField("Descrição", db_column="description")
    investigation = models.TextField("Investigação", db_column="investigation", blank=True, default="")
    response = models.TextField("Resposta", db_column="response", blank=True, default="")
    nonconformity = models.ForeignKey("laboratorio.Nonconformity", db_column="nonconformity_id",
                                      verbose_name="NC gerada", on_delete=models.SET_NULL,
                                      related_name="complaints", null=True, blank=True)
    status = models.CharField("Estado", max_length=12, choices=Status.choices,
                              default=Status.RECEIVED, db_index=True)

    class Meta:
        db_table = "laboratorio_qm_reclamacao"
        verbose_name = "Reclamação"
        verbose_name_plural = "Reclamações"
        ordering = ["-received_at"]
        indexes = [models.Index(fields=["tenant", "status"])]

    def __str__(self) -> str:
        return f"{self.code or self.custom_id} ({self.get_status_display()})"


class LabRiskAssessment(NoNameCoreModel):
    """Avaliação de risco (qualidade, biossegurança, operacional, dados, equipamento)."""

    prefix = "QRA"

    class Category(models.TextChoices):
        QUALITY = "QUALIDADE", "Qualidade"
        BIOSAFETY = "BIOSSEGURANCA", "Biossegurança"
        OPERATIONAL = "OPERACIONAL", "Operacional"
        DATA = "DADOS", "Dados"
        EQUIPMENT = "EQUIPAMENTO", "Equipamento"

    class Level(models.TextChoices):
        LOW = "BAIXO", "Baixo"
        MEDIUM = "MEDIO", "Médio"
        HIGH = "ALTO", "Alto"
        CRITICAL = "CRITICO", "Crítico"

    class Status(models.TextChoices):
        OPEN = "ABERTO", "Aberto"
        MITIGATED = "MITIGADO", "Mitigado"
        ACCEPTED = "ACEITE", "Aceite"
        CLOSED = "FECHADO", "Fechado"

    description = models.TextField("Descrição do risco", db_column="description")
    area = models.CharField("Área/atividade", db_column="area", max_length=160, blank=True, default="")
    category = models.CharField("Categoria", db_column="category", max_length=14,
                                choices=Category.choices, default=Category.OPERATIONAL, db_index=True)
    likelihood = models.PositiveSmallIntegerField("Probabilidade (1-5)", db_column="likelihood", default=1)
    impact = models.PositiveSmallIntegerField("Impacto (1-5)", db_column="impact", default=1)
    level = models.CharField("Nível", db_column="level", max_length=8, choices=Level.choices,
                             default=Level.LOW, db_index=True)
    mitigation_plan = models.TextField("Plano de mitigação", db_column="mitigation_plan", blank=True, default="")
    responsible = models.ForeignKey(USER, db_column="responsible_id", verbose_name="Responsável",
                                    on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    review_date = models.DateField("Revisão", db_column="review_date", null=True, blank=True)
    status = models.CharField("Estado", max_length=8, choices=Status.choices,
                              default=Status.OPEN, db_index=True)

    class Meta:
        db_table = "laboratorio_qm_risco"
        verbose_name = "Avaliação de risco"
        verbose_name_plural = "Avaliações de risco"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "category", "level"])]

    def compute_level(self) -> str:
        score = (self.likelihood or 1) * (self.impact or 1)
        if score <= 4:
            return self.Level.LOW
        if score <= 9:
            return self.Level.MEDIUM
        if score <= 15:
            return self.Level.HIGH
        return self.Level.CRITICAL

    def save(self, *args, **kwargs):
        self.level = self.compute_level()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.get_category_display()}: {self.get_level_display()}"


class ManagementReview(NoNameCoreModel):
    """Revisão do sistema de qualidade pela gestão."""

    prefix = "QMR"

    class Status(models.TextChoices):
        SCHEDULED = "AGENDADA", "Agendada"
        HELD = "REALIZADA", "Realizada"
        ACTIONS_OPEN = "ACOES_ABERTAS", "Ações em aberto"
        CLOSED = "FECHADA", "Fechada"

    title = models.CharField("Título", db_column="title", max_length=200)
    review_date = models.DateField("Data", db_column="review_date", default=timezone.localdate, db_index=True)
    chaired_by = models.ForeignKey(USER, db_column="chaired_by_id", verbose_name="Presidida por",
                                   on_delete=models.PROTECT, related_name="+", null=True, blank=True)
    inputs = models.TextField("Entradas (indicadores, auditorias, NCs, reclamações...)",
                              db_column="inputs", blank=True, default="")
    decisions = models.TextField("Decisões e ações", db_column="decisions", blank=True, default="")
    status = models.CharField("Estado", max_length=14, choices=Status.choices,
                              default=Status.SCHEDULED, db_index=True)

    class Meta:
        db_table = "laboratorio_qm_revisao_gestao"
        verbose_name = "Revisão pela gestão"
        verbose_name_plural = "Revisões pela gestão"
        ordering = ["-review_date"]

    def __str__(self) -> str:
        return f"{self.title} ({self.review_date})"
