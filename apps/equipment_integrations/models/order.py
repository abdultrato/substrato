from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class IntegrationOrder(NoNameCoreModel):
    """
    Ordem (worklist) que o equipamento consome. Geralmente corresponde a uma
    RequisicaoAnalise agrupada por equipamento.
    """

    prefixo = "ORD"

    class Estado(models.TextChoices):
        PENDENTE = "PEND", "Pendente"
        ENVIADA = "SEND", "Enviada"
        EM_EXECUCAO = "EXEC", "Em execução"
        CONCLUIDA = "DONE", "Concluída"
        ERRO = "ERRO", "Erro"
        CANCELADA = "CANC", "Cancelada"

    equipamento = models.ForeignKey(
        "integracoes_equipamentos.IntegrationEquipment",
        on_delete=models.PROTECT,
        related_name="ordens",
        db_index=True,
    )
    requisicao = models.ForeignKey(
        "clinico.LabRequest",
        on_delete=models.PROTECT,
        related_name="ordens_integracao",
        db_index=True,
    )

    estado = models.CharField(
        max_length=4,
        choices=Estado.choices,
        default=Estado.PENDENTE,
        db_index=True,
    )

    observacao = models.TextField(blank=True, default="")

    class Meta:
        db_table = "integracoes_equipamentos_integracaoordem"
        verbose_name = "Ordem (Integração)"
        verbose_name_plural = "Ordens (Integração)"
        ordering = ["-criado_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["equipamento", "requisicao"],
                condition=models.Q(deletado=False),
                name="unique_ordem_por_equipamento_requisicao",
            )
        ]
        indexes = [
            models.Index(fields=["inquilino", "equipamento", "estado"]),
            models.Index(fields=["requisicao"]),
        ]

    def clean(self):
        super().clean()
        if self.equipamento_id and self.requisicao_id and self.equipamento.inquilino_id != self.requisicao.inquilino_id:
            raise ValidationError("Equipamento e requisição devem pertencer ao mesmo inquilino.")

    def __str__(self) -> str:
        return f"{self.id_custom} - {self.equipamento}"


class IntegrationOrderItem(NoNameCoreModel):
    prefixo = "ORDIT"

    class Estado(models.TextChoices):
        PENDENTE = "PEND", "Pendente"
        EM_EXECUCAO = "EXEC", "Em execução"
        CONCLUIDO = "DONE", "Concluído"
        ERRO = "ERRO", "Erro"
        CANCELADO = "CANC", "Cancelado"

    ordem = models.ForeignKey(
        IntegrationOrder,
        on_delete=models.CASCADE,
        related_name="itens",
        db_index=True,
    )
    requisicao_item = models.ForeignKey(
        "clinico.LabRequestItem",
        on_delete=models.PROTECT,
        related_name="ordens_integracao_itens",
        db_index=True,
    )

    estado = models.CharField(
        max_length=4,
        choices=Estado.choices,
        default=Estado.PENDENTE,
        db_index=True,
    )

    class Meta:
        db_table = "integracoes_equipamentos_integracaoordemitem"
        verbose_name = "Item de ordem (Integração)"
        verbose_name_plural = "Itens de ordem (Integração)"
        ordering = ["-criado_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["ordem", "requisicao_item"],
                condition=models.Q(deletado=False),
                name="unique_item_por_ordem",
            )
        ]
        indexes = [
            models.Index(fields=["inquilino", "ordem", "estado"]),
        ]

    def clean(self):
        super().clean()
        if self.ordem_id and self.requisicao_item_id and self.ordem.requisicao_id != self.requisicao_item.requisicao_id:
            raise ValidationError("Item deve pertencer à mesma requisição da ordem.")

    def __str__(self) -> str:
        return f"{self.ordem_id} - item {self.requisicao_item_id}"
