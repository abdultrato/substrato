from django.conf import settings
from django.core.exceptions import ValidationError as ve
from django.db import models as m

from .nucleo import CoreModel as cm
from .fields import MoneyField as mf, TipoEventoField as tef


class HistoricoFinanceiro(cm):
    """
    Registro histórico imutável de eventos financeiros.

    • trilha de auditoria confiável
    • rastreabilidade completa
    • não pode ser alterado ou removido
    """

    ORIGENS = (
        ("sistema", "Sistema"),
        ("usuario", "Usuário"),
        ("gateway", "Gateway de Pagamento"),
        ("banco", "Banco"),
        ("api", "API Externa"),
    )

    fatura = m.ForeignKey(
        "billing.Fatura",
        on_delete=m.CASCADE,
        related_name="historico",
    )

    tipo_evento = tef(db_index=True)

    descricao = m.CharField(max_length=255)

    valor = mf(
        null=True,
        blank=True,
        help_text="Valor associado ao evento.",
    )

    referencia_externa = m.CharField(
        max_length=120,
        blank=True,
        help_text="ID de transação externa, autorização bancária, etc.",
    )

    usuario = m.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=m.SET_NULL,
        help_text="Usuário responsável pela ação.",
    )

    origem = m.CharField(
        max_length=20,
        choices=ORIGENS,
        default="sistema",
        help_text="Origem da operação.",
    )

    ip_origem = m.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="Endereço IP da operação.",
    )

    class Meta:
        verbose_name = "Histórico Financeiro"
        verbose_name_plural = "Histórico Financeiro"
        ordering = ["-criado_em"]
        indexes = [
            m.Index(fields=["fatura"]),
            m.Index(fields=["tipo_evento"]),
            m.Index(fields=["criado_em"]),
            m.Index(fields=["origem"]),
        ]

    def __str__(self):
        return f"{self.tipo_evento} - {self.fatura.id_custom}"

    # 🔒 impede alterações
    def save(self, *args, **kwargs):
        if self.pk:
            raise ve("Registros do histórico financeiro não podem ser alterados.")
        super().save(*args, **kwargs)

    # 🔒 impede exclusão
    def delete(self, *args, **kwargs):
        raise ve("Registros do histórico financeiro não podem ser removidos.")
