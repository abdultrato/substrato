"""Modelo de trilha de auditoria de requisições feitas por usuários."""

from __future__ import annotations

from django.conf import settings  # Para obter modelo de usuário configurado
from django.db import models  # ORM

from core.models.base import NoNameCoreModel  # Modelo base sem campo name


class UserActivity(NoNameCoreModel):
    """
    Histórico de actividades por utilizador.

    Registra requisições HTTP relevantes (API/PDF/admin) com:
    - tempo de execução
    - status code
    - rota/resolução DRF quando disponível (basename/action)
    """

    prefix = "AUD"  # Prefixo para IDs amigáveis

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,  # Modelo de usuário configurado
        db_column="user_id",  # Coluna
        on_delete=models.PROTECT,  # Não permite apagar usuário se houver logs
        related_name="auditoria_atividades",  # Nome reverso
        null=True,  # Permite ações anônimas
        blank=True,  # Campo opcional
        db_index=True,  # Índice para filtros por usuário
        verbose_name="Utilizador",
    )

    method = models.CharField(
        db_column="method",  # Coluna
        max_length=10,
        db_index=True,
        verbose_name="Método HTTP",
    )
    path = models.CharField(
        db_column="path",  # Coluna
        max_length=255,
        db_index=True,
        verbose_name="Rota curta",
    )
    full_path = models.TextField(
        db_column="full_path",  # Coluna
        blank=True,
        default="",
        verbose_name="URL completa",
    )

    status_code = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Status HTTP",
    )
    duration_ms = models.PositiveIntegerField(
        db_column="duration_ms",  # Coluna
        null=True,
        blank=True,
        verbose_name="Duração (ms)",
    )

    ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="IP de origem",
    )
    user_agent = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="User-Agent",
    )

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
        db_column="object_id",  # Coluna
        max_length=80,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Objeto (ID)",
    )
    message = models.CharField(
        db_column="message",  # Coluna
        max_length=255,
        blank=True,
        default="",
        verbose_name="Mensagem",
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Metadados",
    )

    class Meta:
        db_table = "auditoria_atividades_atividadeusuario"  # Nome da tabela
        verbose_name = "Actividade do Utilizador"
        verbose_name_plural = "Actividades do Utilizador"
        ordering = ["-created_at", "-id"]  # Mais recentes primeiro
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["tenant", "user", "created_at"]),
            models.Index(fields=["tenant", "status_code"]),
            models.Index(fields=["tenant", "view_basename", "created_at"]),
        ]

    def __str__(self) -> str:
        """Mostra usuário, método, rota e status."""
        u = getattr(self.user, "username", None) or "—"
        return f"{u}: {self.method} {self.path} [{self.status_code}]"
