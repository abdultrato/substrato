from __future__ import annotations

from django.conf import settings
from django.db import models

from nucleo.modelos.base import NoNameCoreModel

User = settings.AUTH_USER_MODEL


class ErroSistema(NoNameCoreModel):
    """
    Registro de erros/exceções não tratadas (MVP).
    """

    prefixo = "ERR"

    usuario = models.ForeignKey(
        User,
        verbose_name="Utilizador",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="erros_sistema",
        db_index=True,
    )

    metodo = models.CharField("Método HTTP", max_length=10, db_index=True)
    caminho = models.CharField("Rota curta", max_length=255, db_index=True)
    path_completo = models.TextField("URL completa", blank=True, default="")

    status_code = models.PositiveSmallIntegerField("Status HTTP", default=500, db_index=True)
    duracao_ms = models.PositiveIntegerField("Duração (ms)", null=True, blank=True)

    ip = models.GenericIPAddressField("IP de origem", null=True, blank=True)
    user_agent = models.CharField("User-Agent", max_length=255, blank=True, default="")

    view_basename = models.CharField(
        "View",
        max_length=120,
        blank=True,
        default="",
        db_index=True,
    )
    view_action = models.CharField(
        "Ação da view",
        max_length=120,
        blank=True,
        default="",
        db_index=True,
    )
    objeto_id = models.CharField("Objeto (ID)", max_length=80, blank=True, default="", db_index=True)

    exception_class = models.CharField("Classe da exceção", max_length=120, blank=True, default="", db_index=True)
    mensagem = models.CharField("Mensagem", max_length=500, blank=True, default="")
    traceback = models.TextField("Traceback", blank=True, default="")
    metadata = models.JSONField("Metadados", default=dict, blank=True)

    class Meta:
        verbose_name = "Erro do Sistema"
        verbose_name_plural = "Erros do Sistema"
        ordering = ["-criado_em", "-id"]
        indexes = [
            models.Index(fields=["inquilino", "criado_em"]),
            models.Index(fields=["inquilino", "status_code", "criado_em"]),
            models.Index(fields=["inquilino", "exception_class", "criado_em"]),
        ]

    def __str__(self) -> str:
        return f"{self.exception_class or 'Erro'}: {self.caminho} [{self.status_code}]"
