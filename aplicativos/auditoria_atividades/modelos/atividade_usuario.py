from __future__ import annotations

from django.conf import settings
from django.db import models

from nucleo.modelos.base import NoNameCoreModel


class AtividadeUsuario(NoNameCoreModel):
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
    )

    metodo = models.CharField(max_length=10, db_index=True)
    caminho = models.CharField(max_length=255, db_index=True)
    path_completo = models.TextField(blank=True, default="")

    status_code = models.PositiveSmallIntegerField(null=True, blank=True, db_index=True)
    duracao_ms = models.PositiveIntegerField(null=True, blank=True)

    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True, default="")

    view_basename = models.CharField(max_length=120, blank=True, default="", db_index=True)
    view_action = models.CharField(max_length=120, blank=True, default="", db_index=True)

    objeto_id = models.CharField(max_length=80, blank=True, default="", db_index=True)
    mensagem = models.CharField(max_length=255, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

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
