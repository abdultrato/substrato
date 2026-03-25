from __future__ import annotations

from django.conf import settings
from django.db import models

from core.models.base import NoNameCoreModel

User = settings.AUTH_USER_MODEL


class SystemError(NoNameCoreModel):
    """
    Registro de erros/exceções não tratadas (MVP).
    """

    prefix = "ERR"

    user = models.ForeignKey(

        User,

        db_column="usuario_id",
        verbose_name="Utilizador",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="erros_sistema",
        db_index=True,
    )

    method = models.CharField("Método HTTP", 

        db_column="metodo",

         max_length=10, db_index=True)
    path = models.CharField("Rota curta", 
        db_column="caminho",
         max_length=255, db_index=True)
    full_path = models.TextField("URL completa", 
        db_column="path_completo",
         blank=True, default="")

    status_code = models.PositiveSmallIntegerField("Status HTTP", default=500, db_index=True)
    duration_ms = models.PositiveIntegerField("Duração (ms)", 
        db_column="duracao_ms",
         null=True, blank=True)

    ip = models.GenericIPAddressField("IP de origin", null=True, blank=True)
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
    object_id = models.CharField("Objeto (ID)", 
        db_column="objeto_id",
         max_length=80, blank=True, default="", db_index=True)

    exception_class = models.CharField("Classe da exceção", max_length=120, blank=True, default="", db_index=True)
    message = models.CharField("Mensagem", 
        db_column="mensagem",
         max_length=500, blank=True, default="")
    traceback = models.TextField("Traceback", blank=True, default="")
    metadata = models.JSONField("Metadados", default=dict, blank=True)

    class Meta:
        db_table = "monitoramento_errosistema"
        verbose_name = "Erro do Sistema"
        verbose_name_plural = "Erros do Sistema"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["tenant", "status_code", "created_at"]),
            models.Index(fields=["tenant", "exception_class", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.exception_class or 'Erro'}: {self.path} [{self.status_code}]"
