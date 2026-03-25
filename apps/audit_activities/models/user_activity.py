from __future__ import annotations

from django.conf import settings
from django.db import models

from core.models.base import NoNameCoreModel


class UserActivity(NoNameCoreModel):
    """
    Histórico de actividades por utilizador.

    Registra requisições HTTP relevantes (API/PDF/admin) com:
    - tempo de execução
    - status code
    - rota/resolução DRF quando disponível (basename/action)
    """

    prefix = "AUD"

    user = models.ForeignKey(

        settings.AUTH_USER_MODEL,

        db_column="user_id",
        on_delete=models.PROTECT,
        related_name="auditoria_atividades",
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Utilizador",
    )

    method = models.CharField(

        db_column="method",

        max_length=10, db_index=True, verbose_name="Método HTTP")
    path = models.CharField(
        db_column="path",
        max_length=255, db_index=True, verbose_name="Rota curta")
    full_path = models.TextField(
        db_column="full_path",
        blank=True, default="", verbose_name="URL completa")

    status_code = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Status HTTP",
    )
    duration_ms = models.PositiveIntegerField(
        db_column="duration_ms",
        null=True, blank=True, verbose_name="Duração (ms)")

    ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP de origin")
    user_agent = models.CharField(max_length=255, blank=True, default="", verbose_name="User-Agent")

    view_basename = models.CharField(
        max_length=120,
        blank=True,
        default="",
        db_index=True,
        verbose_name="View",
    )
    view_action = models.CharField(
        max_length=120,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Ação da view",
    )

    object_id = models.CharField(

        db_column="object_id",

        max_length=80,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Objeto (ID)",
    )
    message = models.CharField(
        db_column="message",
        max_length=255, blank=True, default="", verbose_name="Mensagem")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="Metadados")

    class Meta:
        db_table = "auditoria_atividades_atividadeusuario"
        verbose_name = "Actividade do Utilizador"
        verbose_name_plural = "Actividades do Utilizador"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["tenant", "user", "created_at"]),
            models.Index(fields=["tenant", "status_code"]),
            models.Index(fields=["tenant", "view_basename", "created_at"]),
        ]

    def __str__(self) -> str:
        u = getattr(self.user, "username", None) or "—"
        return f"{u}: {self.method} {self.path} [{self.status_code}]"
