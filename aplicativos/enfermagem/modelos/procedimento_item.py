from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction

from aplicativos.farmacia.models.lote import Lote

from nucleo.modelos.base import NoNameCoreModel


class ProcedimentoItem(NoNameCoreModel):
    prefixo = "PROCIT"

    procedimento = models.ForeignKey(
        "enfermagem.Procedimento",
        on_delete=models.CASCADE,
        related_name="itens",
        db_index=True,
    )
    catalogo = models.ForeignKey(
        "enfermagem.ProcedimentoCatalogo",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="itens_lancados",
        db_index=True,
    )
    descricao = models.CharField(max_length=255, blank=True, default="", db_index=True)
    quantidade = models.PositiveIntegerField(default=1)
    preco_unitario = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    realizado = models.BooleanField(default=True, db_index=True)
    observacao = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Item de Procedimento"
        verbose_name_plural = "Itens de Procedimento"
        indexes = [
            models.Index(fields=["inquilino", "procedimento"]),
            models.Index(fields=["catalogo"]),
            models.Index(fields=["descricao"]),
        ]

    def clean(self):
        super().clean()
        if self.quantidade <= 0:
            raise ValidationError({"quantidade": "Quantidade deve ser maior que zero."})
        if self.preco_unitario is not None and self.preco_unitario < Decimal("0.00"):
            raise ValidationError(
                {"preco_unitario": "Preço unitário não pode ser negativo."}
            )

        descricao_informada = bool((self.descricao or "").strip())
        if not self.catalogo_id and not descricao_informada:
            raise ValidationError(
                {"descricao": "Informe a descrição ou selecione um procedimento do catálogo."}
            )

        if (
            self.procedimento_id
            and self.catalogo_id
            and self.procedimento.inquilino_id != self.catalogo.inquilino_id
        ):
            raise ValidationError(
                {"catalogo": "Catálogo e procedimento devem pertencer ao mesmo inquilino."}
            )

        if self.pk:
            original = self.__class__.all_objects.get(pk=self.pk)

            if original.catalogo_id != self.catalogo_id:
                raise ValidationError(
                    {"catalogo": "Catálogo do item não pode ser alterado após criação."}
                )

            if original.procedimento_id != self.procedimento_id:
                raise ValidationError(
                    {"procedimento": "Procedimento do item não pode ser alterado."}
                )

            if original.quantidade != self.quantidade and self.materiais_gerados.exists():
                raise ValidationError(
                    {
                        "quantidade": "Quantidade não pode ser alterada após gerar materiais. "
                        "Remova e recrie o item."
                    }
                )

    @property
    def total_linha(self):
        try:
            preco = self.valor.preco_unitario
        except ObjectDoesNotExist:
            preco = self.preco_unitario or Decimal("0.00")

        return (self.quantidade or 0) * (preco or Decimal("0.00"))

    def _aplicar_defaults_catalogo(self):
        if not self.catalogo_id:
            return

        if not (self.descricao or "").strip():
            self.descricao = self.catalogo.nome

    def _resolver_preco_unitario(self):
        if self.catalogo_id:
            return self.catalogo.preco_padrao or Decimal("0.00")

        if self.preco_unitario and self.preco_unitario > 0:
            return self.preco_unitario

        try:
            return self.valor.preco_unitario
        except ObjectDoesNotExist:
            return Decimal("0.00")

    def _upsert_valor(self):
        from aplicativos.enfermagem.modelos.procedimento_item_valor import (
            ProcedimentoItemValor,
        )

        preco = self._resolver_preco_unitario()

        valor, created = ProcedimentoItemValor.all_objects.get_or_create(
            item=self,
            defaults={
                "inquilino_id": self.inquilino_id,
                "preco_unitario": preco,
            },
        )

        if not created and (
            valor.inquilino_id != self.inquilino_id or valor.preco_unitario != preco
        ):
            valor.inquilino_id = self.inquilino_id
            valor.preco_unitario = preco
            valor.save(update_fields=["inquilino", "preco_unitario", "atualizado_em"])

        if self.preco_unitario != preco:
            self.__class__.all_objects.filter(pk=self.pk).update(preco_unitario=preco)
            self.preco_unitario = preco

    def _gerar_materiais_padrao(self):
        if not self.catalogo_id:
            return

        from aplicativos.enfermagem.modelos.procedimento_material import (
            ProcedimentoMaterial,
        )

        materiais = self.catalogo.materiais_padrao.select_related("produto").all()
        for material_padrao in materiais:
            quantidade_material = material_padrao.quantidade_padrao * Decimal(
                self.quantidade or 0
            )
            if quantidade_material <= 0:
                continue

            # ProcedimentoMaterial.quantidade é inteiro (unidades). Mantemos uma validação
            # defensiva aqui para evitar truncamento silencioso.
            if quantidade_material % 1 != 0:
                raise ValidationError(
                    {
                        "catalogo": (
                            f"Quantidade do material padrão '{material_padrao.produto.nome}' "
                            f"deve ser inteira (configuração do catálogo)."
                        )
                    }
                )
            quantidade_material_int = int(quantidade_material)

            lote = (
                Lote.disponiveis(material_padrao.produto)
                .filter(inquilino_id=self.inquilino_id)
                .filter(saldo__gte=quantidade_material_int)
                .first()
            )

            custo = material_padrao.custo_unitario_padrao
            if custo in (None, Decimal("0.00")):
                custo = material_padrao.produto.preco_venda

            if lote is None:
                # Permite criar a requisição do procedimento mesmo com falta de estoque.
                # A baixa de estoque será exigida no momento da faturação/emissão.
                material = ProcedimentoMaterial(
                    inquilino=self.inquilino,
                    procedimento=self.procedimento,
                    procedimento_item=self,
                    produto=material_padrao.produto,
                    lote=None,
                    quantidade=quantidade_material_int,
                    custo_unitario=custo,
                    observacao=material_padrao.observacao,
                )
                material.save(alocar_estoque=False)
            else:
                ProcedimentoMaterial.objects.create(
                    inquilino=self.inquilino,
                    procedimento=self.procedimento,
                    procedimento_item=self,
                    produto=material_padrao.produto,
                    lote=lote,
                    quantidade=quantidade_material_int,
                    custo_unitario=custo,
                    observacao=material_padrao.observacao,
                )

    @transaction.atomic
    def save(self, *args, **kwargs):
        criando = self.pk is None

        if not self.inquilino_id and self.procedimento_id:
            self.inquilino_id = self.procedimento.inquilino_id

        self._aplicar_defaults_catalogo()
        self.full_clean()

        super().save(*args, **kwargs)

        if criando:
            self._gerar_materiais_padrao()

        self._upsert_valor()
        self.procedimento.recalcular_totais()

    @transaction.atomic
    def delete(self, *args, **kwargs):
        procedimento = self.procedimento

        for material in self.materiais_gerados.filter(deletado=False):
            material.delete()

        try:
            valor = self.valor
        except ObjectDoesNotExist:
            valor = None

        if valor and not valor.deletado:
            valor.delete()

        super().delete(*args, **kwargs)
        procedimento.recalcular_totais()

    def __str__(self):
        return f"{self.descricao} x{self.quantidade}"
