from __future__ import annotations

from django.db import models

from nucleo.modelos.base import CoreModel


class ProcedimentoCirurgico(CoreModel):
    """
    Catálogo de procedimentos cirúrgicos.

    Usado para padronizar o campo "procedimento" na cirurgia e permitir
    múltiplos procedimentos na mesma cirurgia.
    """

    prefixo = "PCIR"

    descricao = models.TextField(
        verbose_name="Descrição",
        blank=True,
        default="",
    )

    ativo = models.BooleanField(
        verbose_name="Ativo",
        default=True,
        db_index=True,
    )

    class Meta:
        verbose_name = "Procedimento Cirúrgico"
        verbose_name_plural = "Procedimentos Cirúrgicos"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["inquilino", "ativo", "nome"]),
        ]

    def __str__(self) -> str:
        return self.nome or f"Procedimento Cirúrgico {self.pk}"

