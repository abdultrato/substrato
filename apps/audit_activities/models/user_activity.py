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

    prefixo = "AUD"

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="auditoria_atividades",
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Utilizador",
    )

    metodo = models.CharField(max_length=10, db_index=True, verbose_name="Método HTTP")
    caminho = models.CharField(max_length=255, db_index=True, verbose_name="Rota curta")
    path_completo = models.TextField(blank=True, default="", verbose_name="URL completa")

    status_code = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Status HTTP",
    )
    duracao_ms = models.PositiveIntegerField(null=True, blank=True, verbose_name="Duração (ms)")

    ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP de origem")
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

    objeto_id = models.CharField(
        max_length=80,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Objeto (ID)",
    )
    mensagem = models.CharField(max_length=255, blank=True, default="", verbose_name="Mensagem")
    metadata = models.JSONField(default=dict, blank=True, verbose_name="Metadados")

    class Meta:
        verbose_name = "Actividade do Utilizador"
        verbose_name_plural = "Actividades do Utilizador"
        ordering = ["-criado_em", "-id"]
        indexes = [
            models.Index(fields=["inquilino", "criado_em"]),
            models.Index(fields=["inquilino", "usuario", "criado_em"]),
            models.Index(fields=["inquilino", "status_code"]),
            models.Index(fields=["inquilino", "view_basename", "criado_em"]),
        ]

    def __str__(self) -> str:
        u = getattr(self.usuario, "username", None) or "—"
        return f"{u}: {self.metodo} {self.caminho} [{self.status_code}]"
