from __future__ import annotations

from django.conf import settings
from django.db import models

from core.models.base import NoNameCoreModel

User = settings.AUTH_USER_MODEL


class AiSession(NoNameCoreModel):
    """Sessão de conversa da IA Operacional."""

    prefix = "AIS"

    class Language(models.TextChoices):
        PORTUGUESE = "pt", "Português"
        ENGLISH = "en", "Inglês"

    class Status(models.TextChoices):
        ACTIVE = "active", "Activa"
        CLOSED = "closed", "Encerrada"
        ARCHIVED = "archived", "Arquivada"

    user = models.ForeignKey(
        User,
        verbose_name="Utilizador",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_sessions",
        db_index=True,
    )
    title = models.CharField("Título", max_length=160, blank=True, default="")
    language = models.CharField(
        "Idioma",
        max_length=8,
        choices=Language.choices,
        default=Language.PORTUGUESE,
        db_index=True,
    )
    active_module = models.CharField("Módulo activo", max_length=80, blank=True, default="", db_index=True)
    status = models.CharField(
        "Estado",
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    last_message_at = models.DateTimeField("Última mensagem em", null=True, blank=True, db_index=True)
    metadata = models.JSONField("Metadados", default=dict, blank=True)

    class Meta:
        db_table = "ai_assistant_session"
        verbose_name = "Sessão da IA"
        verbose_name_plural = "Sessões da IA"
        ordering = ["-updated_at", "-id"]
        indexes = [
            models.Index(fields=["tenant", "user", "updated_at"]),
            models.Index(fields=["tenant", "status", "updated_at"]),
            models.Index(fields=["tenant", "active_module", "updated_at"]),
        ]

    def __str__(self) -> str:
        return self.title or self.custom_id or f"Sessão IA #{self.pk}"


class AiMessage(NoNameCoreModel):
    """Mensagem redigida e auditável da conversa."""

    prefix = "AIM"

    class Role(models.TextChoices):
        USER = "user", "Utilizador"
        ASSISTANT = "assistant", "Assistente"
        SYSTEM = "system", "Sistema"
        TOOL = "tool", "Ferramenta"

    session = models.ForeignKey(
        AiSession,
        verbose_name="Sessão",
        on_delete=models.CASCADE,
        related_name="messages",
        db_index=True,
    )
    user = models.ForeignKey(
        User,
        verbose_name="Utilizador",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_messages",
        db_index=True,
    )
    role = models.CharField("Papel", max_length=20, choices=Role.choices, db_index=True)
    content = models.TextField("Conteúdo", blank=True, default="")
    content_redacted = models.TextField("Conteúdo redigido", blank=True, default="")
    metadata = models.JSONField("Metadados", default=dict, blank=True)
    token_input_count = models.PositiveIntegerField("Tokens de entrada", default=0)
    token_output_count = models.PositiveIntegerField("Tokens de saída", default=0)

    class Meta:
        db_table = "ai_assistant_message"
        verbose_name = "Mensagem da IA"
        verbose_name_plural = "Mensagens da IA"
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["session", "created_at"]),
            models.Index(fields=["session", "role", "created_at"]),
            models.Index(fields=["tenant", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_role_display()}: {self.content_redacted[:80]}"


class AiToolCall(NoNameCoreModel):
    """Execução auditável de ferramenta interna consultada pela IA."""

    prefix = "AIT"

    class Mode(models.TextChoices):
        READ = "read", "Leitura"
        PREPARE_ACTION = "prepare_action", "Preparar acção"
        WRITE_CONFIRMED = "write_confirmed", "Escrita confirmada"

    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        SUCCESS = "success", "Sucesso"
        BLOCKED = "blocked", "Bloqueada"
        ERROR = "error", "Erro"

    session = models.ForeignKey(
        AiSession,
        verbose_name="Sessão",
        on_delete=models.CASCADE,
        related_name="tool_calls",
        db_index=True,
    )
    message = models.ForeignKey(
        AiMessage,
        verbose_name="Mensagem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tool_calls",
    )
    tool_name = models.CharField("Ferramenta", max_length=120, db_index=True)
    mode = models.CharField("Modo", max_length=30, choices=Mode.choices, default=Mode.READ, db_index=True)
    input_redacted = models.JSONField("Entrada redigida", default=dict, blank=True)
    output_summary = models.TextField("Resumo da saída", blank=True, default="")
    sources = models.JSONField("Fontes", default=list, blank=True)
    status = models.CharField("Estado", max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    duration_ms = models.PositiveIntegerField("Duração (ms)", null=True, blank=True)
    error_message = models.TextField("Mensagem de erro", blank=True, default="")

    class Meta:
        db_table = "ai_assistant_tool_call"
        verbose_name = "Chamada de Ferramenta da IA"
        verbose_name_plural = "Chamadas de Ferramentas da IA"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["session", "tool_name", "created_at"]),
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["tenant", "tool_name", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.tool_name} [{self.status}]"


class AiSuggestedAction(NoNameCoreModel):
    """Acção preparada pela IA e sujeita a confirmação quando houver impacto operacional."""

    prefix = "AIA"

    class Status(models.TextChoices):
        PENDING_CONFIRMATION = "pending_confirmation", "Pendente de confirmação"
        CONFIRMED = "confirmed", "Confirmada"
        CANCELLED = "cancelled", "Cancelada"
        EXPIRED = "expired", "Expirada"
        FAILED = "failed", "Falhada"

    session = models.ForeignKey(
        AiSession,
        verbose_name="Sessão",
        on_delete=models.CASCADE,
        related_name="suggested_actions",
        db_index=True,
    )
    created_by = models.ForeignKey(
        User,
        verbose_name="Criada por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_suggested_actions",
    )
    action_type = models.CharField("Tipo de acção", max_length=120, db_index=True)
    payload = models.JSONField("Payload", default=dict, blank=True)
    payload_redacted = models.JSONField("Payload redigido", default=dict, blank=True)
    status = models.CharField(
        "Estado",
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING_CONFIRMATION,
        db_index=True,
    )
    requires_confirmation = models.BooleanField("Requer confirmação", default=True)
    confirmation_summary = models.TextField("Resumo para confirmação", blank=True, default="")
    confirmed_by = models.ForeignKey(
        User,
        verbose_name="Confirmada por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_confirmed_actions",
    )
    confirmed_at = models.DateTimeField("Confirmada em", null=True, blank=True)
    executed_at = models.DateTimeField("Executada em", null=True, blank=True)
    result_summary = models.TextField("Resultado", blank=True, default="")
    result_href = models.CharField("Ligação de resultado", max_length=500, blank=True, default="")

    class Meta:
        db_table = "ai_assistant_suggested_action"
        verbose_name = "Acção Sugerida pela IA"
        verbose_name_plural = "Acções Sugeridas pela IA"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["tenant", "status", "created_at"]),
            models.Index(fields=["session", "status", "created_at"]),
            models.Index(fields=["tenant", "action_type", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.action_type} [{self.status}]"


class AiPolicyEvent(NoNameCoreModel):
    """Evento de política, bloqueio ou decisão de segurança da IA."""

    prefix = "AIP"

    class Severity(models.TextChoices):
        INFO = "info", "Informação"
        WARNING = "warning", "Aviso"
        CRITICAL = "critical", "Crítico"

    session = models.ForeignKey(
        AiSession,
        verbose_name="Sessão",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="policy_events",
        db_index=True,
    )
    user = models.ForeignKey(
        User,
        verbose_name="Utilizador",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_policy_events",
        db_index=True,
    )
    severity = models.CharField(
        "Severidade",
        max_length=20,
        choices=Severity.choices,
        default=Severity.INFO,
        db_index=True,
    )
    policy_key = models.CharField("Chave da política", max_length=120, db_index=True)
    reason = models.TextField("Motivo", blank=True, default="")
    blocked = models.BooleanField("Bloqueado", default=False, db_index=True)
    metadata = models.JSONField("Metadados", default=dict, blank=True)

    class Meta:
        db_table = "ai_assistant_policy_event"
        verbose_name = "Evento de Política da IA"
        verbose_name_plural = "Eventos de Política da IA"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["tenant", "severity", "created_at"]),
            models.Index(fields=["tenant", "policy_key", "created_at"]),
            models.Index(fields=["tenant", "blocked", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.policy_key}: {self.reason[:80]}"
