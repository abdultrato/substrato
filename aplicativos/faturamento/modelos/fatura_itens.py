from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from nucleo.modelos.base import NoNameCoreModel


class FaturaItem(NoNameCoreModel):
    prefixo = "FTIT"

    class TipoItem(models.TextChoices):
        EXAME = "EXA", "Exame"
        EXAME_MEDICO = "EXM", "Exame médico"
        ITEM_VENDA = "FAR", "Item de farmácia"
        PROCEDIMENTO_ITEM = "PRC", "Serviço de enfermagem"
        PROCEDIMENTO_MATERIAL = "MAT", "Material de enfermagem"
        AJUSTE = "AJU", "Ajuste manual"

    fatura = models.ForeignKey(
        "faturamento.Fatura",
        on_delete=models.CASCADE,
        related_name="itens",
    )
    tipo_item = models.CharField(
        max_length=3,
        choices=TipoItem.choices,
        default=TipoItem.EXAME,
        db_index=True,
    )

    exame = models.ForeignKey(
        "clinico.Exame",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    exame_medico = models.ForeignKey(
        "clinico.ExameMedico",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    item_venda = models.ForeignKey(
        "farmacia.ItemVenda",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    procedimento_item = models.ForeignKey(
        "enfermagem.ProcedimentoItem",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    procedimento_material = models.ForeignKey(
        "enfermagem.ProcedimentoMaterial",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )

    descricao = models.CharField(max_length=255, blank=True)
    quantidade = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
    )
    preco_unitario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["fatura", "exame"],
                condition=Q(exame__isnull=False, deletado=False),
                name="unique_exame_por_fatura",
            ),
            models.UniqueConstraint(
                fields=["fatura", "exame_medico"],
                condition=Q(exame_medico__isnull=False, deletado=False),
                name="unique_exame_medico_por_fatura",
            ),
            models.UniqueConstraint(
                fields=["fatura", "item_venda"],
                condition=Q(item_venda__isnull=False, deletado=False),
                name="unique_item_venda_por_fatura",
            ),
            models.UniqueConstraint(
                fields=["fatura", "procedimento_item"],
                condition=Q(procedimento_item__isnull=False, deletado=False),
                name="unique_proc_item_por_fatura",
            ),
            models.UniqueConstraint(
                fields=["fatura", "procedimento_material"],
                condition=Q(procedimento_material__isnull=False, deletado=False),
                name="unique_proc_material_por_fatura",
            ),
        ]

    @property
    def total(self):
        return (self.preco_unitario or Decimal("0.00")) * (
            self.quantidade or Decimal("0.00")
        )

    def _origem_esperada(self):
        return {
            self.TipoItem.EXAME: self.fatura.Origem.CLINICO,
            self.TipoItem.EXAME_MEDICO: self.fatura.Origem.CLINICO,
            self.TipoItem.ITEM_VENDA: self.fatura.Origem.FARMACIA,
            self.TipoItem.PROCEDIMENTO_ITEM: self.fatura.Origem.ENFERMAGEM,
            self.TipoItem.PROCEDIMENTO_MATERIAL: self.fatura.Origem.ENFERMAGEM,
            self.TipoItem.AJUSTE: None,
        }[self.tipo_item]

    def _preencher_de_referencia(self):
        if self.tipo_item == self.TipoItem.EXAME and self.exame_id:
            if not self.descricao.strip():
                self.descricao = self.exame.nome
            if self.preco_unitario == Decimal("0.00"):
                self.preco_unitario = self.exame.preco
            return

        if self.tipo_item == self.TipoItem.EXAME_MEDICO and self.exame_medico_id:
            if not self.descricao.strip():
                self.descricao = self.exame_medico.nome
            if self.preco_unitario == Decimal("0.00"):
                self.preco_unitario = self.exame_medico.preco
            return

        if self.tipo_item == self.TipoItem.ITEM_VENDA and self.item_venda_id:
            self.descricao = self.item_venda.produto.nome
            self.quantidade = Decimal(self.item_venda.quantidade)
            self.preco_unitario = self.item_venda.preco_unitario
            return

        if self.tipo_item == self.TipoItem.PROCEDIMENTO_ITEM and self.procedimento_item_id:
            if not self.descricao.strip():
                self.descricao = self.procedimento_item.descricao
            self.quantidade = Decimal(self.procedimento_item.quantidade)
            try:
                self.preco_unitario = self.procedimento_item.valor.preco_unitario
            except ObjectDoesNotExist:
                self.preco_unitario = self.procedimento_item.preco_unitario
            return

        if (
            self.tipo_item == self.TipoItem.PROCEDIMENTO_MATERIAL
            and self.procedimento_material_id
        ):
            if not self.descricao.strip():
                self.descricao = self.procedimento_material.produto.nome
            self.quantidade = Decimal(self.procedimento_material.quantidade)
            try:
                self.preco_unitario = self.procedimento_material.valor.custo_unitario
            except ObjectDoesNotExist:
                self.preco_unitario = self.procedimento_material.custo_unitario

    def clean(self):
        super().clean()

        referencias = {
            "exame": bool(self.exame_id),
            "exame_medico": bool(self.exame_medico_id),
            "item_venda": bool(self.item_venda_id),
            "procedimento_item": bool(self.procedimento_item_id),
            "procedimento_material": bool(self.procedimento_material_id),
        }
        tipo_para_campo = {
            self.TipoItem.EXAME: "exame",
            self.TipoItem.EXAME_MEDICO: "exame_medico",
            self.TipoItem.ITEM_VENDA: "item_venda",
            self.TipoItem.PROCEDIMENTO_ITEM: "procedimento_item",
            self.TipoItem.PROCEDIMENTO_MATERIAL: "procedimento_material",
            self.TipoItem.AJUSTE: None,
        }

        if self.quantidade <= 0:
            raise ValidationError({"quantidade": "Quantidade deve ser maior que zero."})
        if self.preco_unitario < Decimal("0.00"):
            raise ValidationError(
                {"preco_unitario": "Preço unitário não pode ser negativo."}
            )

        campo_esperado = tipo_para_campo[self.tipo_item]

        if self.tipo_item == self.TipoItem.AJUSTE:
            if any(referencias.values()):
                raise ValidationError(
                    "Item de ajuste manual não pode possuir referência externa."
                )
            if not self.descricao.strip():
                raise ValidationError(
                    {"descricao": "Descrição é obrigatória para ajuste manual."}
                )
        else:
            if not referencias[campo_esperado]:
                raise ValidationError(
                    {campo_esperado: "Informe a referência do tipo selecionado."}
                )
            for campo, informado in referencias.items():
                if campo != campo_esperado and informado:
                    raise ValidationError(
                        {campo: "Remova esta referência, ela não corresponde ao tipo."}
                    )

        origem_esperada = self._origem_esperada()
        if origem_esperada and self.fatura.origem != origem_esperada:
            raise ValidationError(
                "Tipo de item incompatível com a origem selecionada na fatura."
            )

        if self.inquilino_id and self.fatura_id and self.inquilino_id != self.fatura.inquilino_id:
            raise ValidationError("Item e fatura devem pertencer ao mesmo inquilino.")

        if self.exame_id and self.fatura.requisicao_id:
            existe_no_contexto = self.fatura.requisicao.itens.filter(
                exame_id=self.exame_id
            ).exists()
            if not existe_no_contexto:
                raise ValidationError(
                    {"exame": "Exame não pertence à requisição da fatura."}
                )

        if self.exame_medico_id and self.fatura.requisicao_id:
            existe_no_contexto = self.fatura.requisicao.itens.filter(
                exame_medico_id=self.exame_medico_id
            ).exists()
            if not existe_no_contexto:
                raise ValidationError(
                    {"exame_medico": "Exame médico não pertence à requisição da fatura."}
                )

        if self.item_venda_id and self.fatura.venda_id:
            if self.item_venda.venda_id != self.fatura.venda_id:
                raise ValidationError(
                    {"item_venda": "Item de venda não pertence à venda da fatura."}
                )

        if self.procedimento_item_id and self.fatura.procedimento_id:
            if self.procedimento_item.procedimento_id != self.fatura.procedimento_id:
                raise ValidationError(
                    {
                        "procedimento_item": (
                            "Item de procedimento não pertence ao procedimento da fatura."
                        )
                    }
                )

        if self.procedimento_material_id and self.fatura.procedimento_id:
            if (
                self.procedimento_material.procedimento_id
                != self.fatura.procedimento_id
            ):
                raise ValidationError(
                    {
                        "procedimento_material": (
                            "Material não pertence ao procedimento da fatura."
                        )
                    }
                )

    def save(self, *args, **kwargs):
        if self.fatura.estado != self.fatura.Estado.RASCUNHO:
            raise ValidationError("Não é permitido alterar itens de fatura emitida.")

        if not self.inquilino_id and self.fatura_id:
            self.inquilino_id = self.fatura.inquilino_id

        self._preencher_de_referencia()
        self.full_clean()

        super().save(*args, **kwargs)
        self.fatura.persistir_totais()

    def delete(self, *args, **kwargs):
        if self.fatura.estado != self.fatura.Estado.RASCUNHO:
            raise ValidationError("Não é permitido remover itens.")

        fatura = self.fatura
        super().delete(*args, **kwargs)
        fatura.persistir_totais()
