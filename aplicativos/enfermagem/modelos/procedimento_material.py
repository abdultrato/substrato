from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction

from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.movimento import (
    MovimentoEstoque,
    OrigemMovimento,
    TipoMovimento,
)
from nucleo.modelos.base import NoNameCoreModel


class ProcedimentoMaterial(NoNameCoreModel):
    prefixo = "PROCMAT"

    procedimento = models.ForeignKey(
        "enfermagem.Procedimento",
        on_delete=models.CASCADE,
        related_name="materiais",
        db_index=True,
    )
    procedimento_item = models.ForeignKey(
        "enfermagem.ProcedimentoItem",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="materiais_gerados",
        db_index=True,
    )
    produto = models.ForeignKey(
        "farmacia.Produto",
        on_delete=models.PROTECT,
        related_name="consumos_procedimento",
        db_index=True,
    )
    lote = models.ForeignKey(
        "farmacia.Lote",
        on_delete=models.PROTECT,
        related_name="consumos_procedimento",
        db_index=True,
    )
    quantidade = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
    )
    custo_unitario = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    movimento_estoque = models.OneToOneField(
        "farmacia.MovimentoEstoque",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="consumo_procedimento",
    )
    observacao = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Material do Procedimento"
        verbose_name_plural = "Materiais do Procedimento"
        indexes = [
            models.Index(fields=["inquilino", "procedimento"]),
            models.Index(fields=["procedimento_item"]),
            models.Index(fields=["produto"]),
            models.Index(fields=["lote"]),
        ]

    @property
    def total_linha(self):
        try:
            custo = self.valor.custo_unitario
        except ObjectDoesNotExist:
            custo = self.custo_unitario or Decimal("0.00")

        return (self.quantidade or 0) * (custo or Decimal("0.00"))

    def clean(self):
        super().clean()

        if self.lote_id and self.produto_id and self.lote.produto_id != self.produto_id:
            raise ValidationError(
                {"lote": "O lote selecionado não pertence ao produto informado."}
            )

        if (
            self.procedimento_id
            and self.procedimento_item_id
            and self.procedimento_item.procedimento_id != self.procedimento_id
        ):
            raise ValidationError(
                {"procedimento_item": "Item não pertence ao procedimento informado."}
            )

        if (
            self.procedimento_id
            and self.produto_id
            and self.procedimento.inquilino_id != self.produto.inquilino_id
        ):
            raise ValidationError(
                {"produto": "Produto e procedimento devem pertencer ao mesmo inquilino."}
            )

        if (
            self.procedimento_id
            and self.lote_id
            and self.procedimento.inquilino_id != self.lote.inquilino_id
        ):
            raise ValidationError(
                {"lote": "Lote e procedimento devem pertencer ao mesmo inquilino."}
            )

        if not self.pk and self.lote_id and self.lote.vencido:
            raise ValidationError({"lote": "Não é permitido consumir lote vencido."})

        if self.pk:
            original = self.__class__.all_objects.get(pk=self.pk)
            campos_immutaveis = (
                "procedimento_id",
                "produto_id",
                "lote_id",
                "quantidade",
                "procedimento_item_id",
            )
            if any(getattr(original, campo) != getattr(self, campo) for campo in campos_immutaveis):
                raise ValidationError(
                    "Material já lançado no estoque é imutável. "
                    "Faça estorno e inclua um novo lançamento."
                )

    def _resolver_custo_unitario(self):
        if self.custo_unitario and self.custo_unitario > 0:
            return self.custo_unitario

        try:
            return self.valor.custo_unitario
        except ObjectDoesNotExist:
            pass

        if self.produto_id and self.produto.preco_venda:
            return self.produto.preco_venda

        return Decimal("0.00")

    def _selecionar_lote_automatico(self):
        if self.lote_id or not self.produto_id:
            return

        quantidade = self.quantidade or 0

        lotes_disponiveis = Lote.disponiveis(self.produto)
        if self.inquilino_id:
            lotes_disponiveis = lotes_disponiveis.filter(inquilino_id=self.inquilino_id)

        lote = lotes_disponiveis.filter(saldo__gte=quantidade).first()
        if lote is None:
            raise ValidationError(
                {
                    "produto": (
                        "Sem lote válido com saldo suficiente para este material."
                    )
                }
            )

        self.lote = lote

    def _upsert_valor(self):
        from aplicativos.enfermagem.modelos.procedimento_material_valor import (
            ProcedimentoMaterialValor,
        )

        custo = self._resolver_custo_unitario()

        valor, created = ProcedimentoMaterialValor.all_objects.get_or_create(
            material=self,
            defaults={
                "inquilino_id": self.inquilino_id,
                "custo_unitario": custo,
            },
        )

        if not created and (
            valor.inquilino_id != self.inquilino_id or valor.custo_unitario != custo
        ):
            valor.inquilino_id = self.inquilino_id
            valor.custo_unitario = custo
            valor.save(update_fields=["inquilino", "custo_unitario", "atualizado_em"])

        if self.custo_unitario != custo:
            self.__class__.all_objects.filter(pk=self.pk).update(custo_unitario=custo)
            self.custo_unitario = custo

    @transaction.atomic
    def save(self, *args, **kwargs):
        criando = self.pk is None

        if not self.inquilino_id and self.procedimento_id:
            self.inquilino_id = self.procedimento.inquilino_id

        self._selecionar_lote_automatico()
        self.full_clean()
        super().save(*args, **kwargs)

        if criando:
            lote = Lote.objects.select_for_update().get(pk=self.lote_id)
            if self.quantidade > lote.saldo():
                raise ValidationError(
                    {"quantidade": "Estoque insuficiente no lote selecionado."}
                )

            movimento = MovimentoEstoque.objects.create(
                nome=(
                    f"Consumo {self.procedimento.id_custom or self.procedimento_id} "
                    f"- {self.produto.nome}"
                ),
                lote=lote,
                tipo=TipoMovimento.SAIDA,
                origem=OrigemMovimento.PROCEDIMENTO,
                quantidade=self.quantidade,
                inquilino=self.inquilino,
            )
            self.movimento_estoque = movimento
            super().save(update_fields=["movimento_estoque"])

        self._upsert_valor()
        self.procedimento.recalcular_totais()

    @transaction.atomic
    def delete(self, *args, **kwargs):
        if self.deletado:
            return

        procedimento = self.procedimento

        if self.movimento_estoque_id:
            MovimentoEstoque.objects.create(
                nome=(
                    f"Estorno {self.procedimento.id_custom or self.procedimento_id} "
                    f"- {self.produto.nome}"
                ),
                lote=self.lote,
                tipo=TipoMovimento.ENTRADA,
                origem=OrigemMovimento.PROCEDIMENTO,
                quantidade=self.quantidade,
                inquilino=self.inquilino,
            )

        try:
            valor = self.valor
        except ObjectDoesNotExist:
            valor = None

        if valor and not valor.deletado:
            valor.delete()

        super().delete(*args, **kwargs)
        procedimento.recalcular_totais()

    def __str__(self):
        return f"{self.produto.nome} x{self.quantidade}"
