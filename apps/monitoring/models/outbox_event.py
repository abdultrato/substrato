from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

from django.db import models
from django.utils import timezone


class TransactionalOutboxEvent(models.Model):
    """
    Outbox transacional para eventos emitidos pelo backend Django.

    O registo é persistido após o commit e despachado por worker/comando.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        DELIVERED = "delivered", "Entregue"
        FAILED = "failed", "Falhado"
        DEAD_LETTER = "dead_letter", "Dead letter"

    event_id = models.UUIDField(
        verbose_name="ID do evento",
        default=uuid4,
        unique=True,
        editable=False,
        db_index=True,
    )
    event_type = models.CharField(
        verbose_name="Tipo de evento",
        max_length=180,
        db_index=True,
    )
    aggregate_id = models.CharField(
        verbose_name="ID do agregado",
        max_length=120,
        blank=True,
        default="",
    )
    aggregate_version = models.PositiveIntegerField(
        verbose_name="Versão do agregado",
        null=True,
        blank=True,
    )
    tenant_identifier = models.CharField(
        verbose_name="Cliente",
        max_length=80,
        null=True,
        blank=True,
        db_index=True,
    )
    trace_id = models.CharField(
        verbose_name="Trace ID",
        max_length=100,
        blank=True,
        default="",
        db_index=True,
    )
    idempotency_key = models.CharField(
        verbose_name="Chave de idempotência",
        max_length=140,
        blank=True,
        default="",
        db_index=True,
    )
    source = models.CharField(
        verbose_name="Origem",
        max_length=80,
        default="django.event_bus",
    )
    payload = models.JSONField(verbose_name="Payload", default=dict)
    status = models.CharField(
        verbose_name="Estado",
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    attempts = models.PositiveIntegerField(verbose_name="Tentativas", default=0)
    available_at = models.DateTimeField(
        verbose_name="Disponível em",
        default=timezone.now,
        db_index=True,
    )
    occurred_at = models.DateTimeField(
        verbose_name="Ocorrido em",
        default=timezone.now,
        db_index=True,
    )
    published_at = models.DateTimeField(
        verbose_name="Publicado em",
        null=True,
        blank=True,
    )
    last_error = models.TextField(
        verbose_name="Último erro",
        blank=True,
        default="",
    )
    created_at = models.DateTimeField(
        verbose_name="Criado em",
        auto_now_add=True,
        db_index=True,
    )
    updated_at = models.DateTimeField(
        verbose_name="Atualizado em",
        auto_now=True,
    )

    class Meta:
        db_table = "monitoramento_eventooutbox"
        verbose_name = "Evento de Outbox"
        verbose_name_plural = "Eventos de Outbox"
        ordering = ["available_at", "id"]
        indexes = [
            models.Index(fields=["status", "available_at"]),
            models.Index(fields=["event_type", "occurred_at"]),
            models.Index(fields=["tenant_identifier", "status", "available_at"]),
        ]

    def mark_delivered(self) -> None:
        self.status = self.Status.DELIVERED
        self.published_at = timezone.now()
        self.last_error = ""
        self.save(update_fields=["status", "published_at", "last_error", "updated_at"])

    def mark_failed(self, error: str, *, retry_after_seconds: int, max_attempts: int) -> None:
        next_attempt = self.attempts + 1
        dead_letter = next_attempt >= max(1, int(max_attempts))

        self.attempts = next_attempt
        self.last_error = str(error or "")
        self.published_at = None
        if dead_letter:
            self.status = self.Status.DEAD_LETTER
            self.available_at = timezone.now()
        else:
            self.status = self.Status.FAILED
            self.available_at = timezone.now() + timedelta(seconds=max(0, int(retry_after_seconds)))

        self.save(
            update_fields=[
                "attempts",
                "last_error",
                "published_at",
                "status",
                "available_at",
                "updated_at",
            ]
        )

    def requeue(self) -> None:
        """Recoloca o evento na fila para nova tentativa (recuperação manual de dead-letter, §34).

        Reinicia o orçamento de tentativas e torna o evento imediatamente elegível
        para o dispatcher (que só processa PENDING/FAILED), de modo que um evento em
        dead-letter possa ser reprocessado depois de corrigida a causa raiz.
        """
        self.status = self.Status.PENDING
        self.attempts = 0
        self.available_at = timezone.now()
        self.last_error = ""
        self.save(update_fields=["status", "attempts", "available_at", "last_error", "updated_at"])
