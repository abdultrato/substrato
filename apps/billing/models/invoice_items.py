from decimal import ROUND_HALF_UP, Decimal

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models, transaction
from django.db.models import Q

from apps.consultations.utils.pricing import calcular_multiplicador_preco
from core.models.base import NoNameCoreModel


class InvoiceItem(NoNameCoreModel):
    prefixo = "FTIT"

    class ItemType(models.TextChoices):
        EXAME = "EXA", "Exame"
        EXAME_MEDICO = "EXM", "Exame médico"
        ITEM_VENDA = "FAR", "Item de farmácia"
        PROCEDIMENTO_ITEM = "PRC", "Serviço de enfermagem"
        PROCEDIMENTO_MATERIAL = "MAT", "Material de enfermagem"
        AJUSTE = "AJU", "Ajuste manual"

    TipoItem = ItemType

    fatura = models.ForeignKey(
        "faturamento.Invoice",
        verbose_name="Fatura",
        on_delete=models.CASCADE,
        related_name="itens",
    )
    tipo_item = models.CharField(
        verbose_name="Tipo de item",
        max_length=3,
        choices=ItemType.choices,
        default=ItemType.EXAME,
        db_index=True,
    )

    exame = models.ForeignKey(
        "clinico.LabExam",
        verbose_name="Exame",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    exame_medico = models.ForeignKey(
        "clinico.MedicalExam",
        verbose_name="Exame médico",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    item_venda = models.ForeignKey(
        "farmacia.SaleItem",
        verbose_name="Item de venda",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    procedimento_item = models.ForeignKey(
        "enfermagem.ProcedureItem",
        verbose_name="Item de procedimento",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    procedimento_material = models.ForeignKey(
        "enfermagem.ProcedureMaterial",
        verbose_name="Material de procedimento",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )

    descricao = models.CharField(verbose_name="Descrição", max_length=255, blank=True, default="")
    quantidade = models.DecimalField(
        verbose_name="Quantidade",
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
    )
    preco_unitario = models.DecimalField(
        verbose_name="Preço unitário",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    aplica_iva = models.BooleanField(
        verbose_name="Aplicar IVA?",
        default=True,
        help_text="Desmarque para não aplicar IVA neste item.",
    )

    iva_percentual = models.DecimalField(
        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        default=None,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Deixe em branco para herdar do item (exame/produto/procedimento).",
    )

    class Meta:
        verbose_name = "Item de Fatura"
        verbose_name_plural = "Itens de Fatura"
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
        return (self.preco_unitario or Decimal("0.00")) * (self.quantidade or Decimal("0.00"))

    @property
    def total_sem_iva(self) -> Decimal:
        return self.total or Decimal("0.00")

    @property
    def vat_amount(self) -> Decimal:
        if not self.aplica_iva:
            return Decimal("0.00")
        base = self.total_sem_iva or Decimal("0.00")
        perc = self.iva_percentual
        if perc is None or perc == "":
            perc = Decimal("0.00")
        try:
            valor = base * (Decimal(perc) / Decimal("100.00"))
            return valor.quantize(Decimal("0.01"))
        except Exception:
            return Decimal("0.00")

    @property
    def total_com_iva(self) -> Decimal:
        return (self.total_sem_iva or Decimal("0.00")) + (self.vat_amount or Decimal("0.00"))

    def _schedule_recalculation(self):
        try:
            from tasks.billing.recalculation import recalculate_invoice_task
        except ImportError:
            return

        fatura_id = getattr(self, "fatura_id", None)
        if not fatura_id:
            return

        def _enqueue():
            try:
                recalculate_invoice_task.delay(fatura_id)
                return
            except Exception:
                # Fallback local quando o broker não está disponível.
                try:
                    from apps.billing.models.invoice import Invoice

                    fatura = Invoice.objects.filter(pk=fatura_id).first()
                    if fatura:
                        fatura.persistir_totais()
                except Exception:
                    pass

        try:
            transaction.on_commit(_enqueue)
        except Exception:
            _enqueue()

    def _origem_esperada(self):
        try:
            if self.fatura_id and self.fatura.origem == self.fatura.Origem.MISTA:
                return None
        except Exception:
            pass
        return {
            self.TipoItem.EXAME: self.fatura.Origem.CLINICO,
            self.TipoItem.EXAME_MEDICO: self.fatura.Origem.CLINICO,
            self.TipoItem.ITEM_VENDA: self.fatura.Origem.FARMACIA,
            self.TipoItem.PROCEDIMENTO_ITEM: self.fatura.Origem.ENFERMAGEM,
            self.TipoItem.PROCEDIMENTO_MATERIAL: self.fatura.Origem.ENFERMAGEM,
            self.TipoItem.AJUSTE: None,
        }[self.tipo_item]

    def _pricing_reference_date(self):
        if not self.fatura_id:
            return None

        requisicao = getattr(self.fatura, "requisicao", None)
        if requisicao and getattr(requisicao, "criado_em", None):
            return requisicao.criado_em

        return getattr(self.fatura, "criado_em", None)

    def _apply_exam_pricing(self, preco_base: Decimal) -> Decimal:
        if preco_base is None:
            return Decimal("0.00")

        data_ref = self._pricing_reference_date()
        if not data_ref:
            return preco_base

        try:
            inquilino = getattr(self.fatura, "inquilino", None) or getattr(self, "inquilino", None)
            multiplicador = calcular_multiplicador_preco(inquilino, data_ref, feriado_manual=False)
            return (preco_base * multiplicador).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except Exception:
            return preco_base

    def _resolve_reference_vat_percentage(self) -> Decimal:
        """
        Resolve IVA (%) a partir da referência do item.
        Mantém 16% como padrão defensivo (compatível com o comportamento anterior),
        permitindo configurar IVA individual por item no catálogo.
        """
        if self.tipo_item == self.TipoItem.EXAME and self.exame_id:
            return getattr(self.exame, "iva_percentual", None) or Decimal("0.00")

        if self.tipo_item == self.TipoItem.EXAME_MEDICO and self.exame_medico_id:
            return getattr(self.exame_medico, "iva_percentual", None) or Decimal("0.00")

        if self.tipo_item == self.TipoItem.ITEM_VENDA and self.item_venda_id:
            produto = getattr(self.item_venda, "produto", None)
            return getattr(produto, "iva_percentual", None) or Decimal("0.00")

        if self.tipo_item == self.TipoItem.PROCEDIMENTO_ITEM and self.procedimento_item_id:
            catalogo = getattr(self.procedimento_item, "catalogo", None)
            if catalogo is not None:
                return getattr(catalogo, "iva_percentual", None) or Decimal("0.00")
            return Decimal("16.00")

        if self.tipo_item == self.TipoItem.PROCEDIMENTO_MATERIAL and self.procedimento_material_id:
            produto = getattr(self.procedimento_material, "produto", None)
            return getattr(produto, "iva_percentual", None) or Decimal("0.00")

        if self.tipo_item == self.TipoItem.AJUSTE:
            return Decimal("16.00")

        return Decimal("0.00")

    def _resolve_reference_applies_vat(self) -> bool:
        if self.tipo_item == self.TipoItem.EXAME and self.exame_id:
            return getattr(self.exame, "aplica_iva_por_padrao", True)

        if self.tipo_item == self.TipoItem.EXAME_MEDICO and self.exame_medico_id:
            return getattr(self.exame_medico, "aplica_iva_por_padrao", True)

        if self.tipo_item == self.TipoItem.ITEM_VENDA and self.item_venda_id:
            produto = getattr(self.item_venda, "produto", None)
            return getattr(produto, "aplica_iva_por_padrao", True)

        if self.tipo_item == self.TipoItem.PROCEDIMENTO_ITEM and self.procedimento_item_id:
            catalogo = getattr(self.procedimento_item, "catalogo", None)
            if catalogo is not None:
                return getattr(catalogo, "aplica_iva_por_padrao", True)
            return True

        if self.tipo_item == self.TipoItem.PROCEDIMENTO_MATERIAL and self.procedimento_material_id:
            produto = getattr(self.procedimento_material, "produto", None)
            return getattr(produto, "aplica_iva_por_padrao", True)

        if self.tipo_item == self.TipoItem.AJUSTE:
            return True

        return True

    def _fill_from_reference(self):
        if self.tipo_item == self.TipoItem.EXAME and self.exame_id:
            if not self.descricao.strip():
                self.descricao = self.exame.nome
            if self.preco_unitario == Decimal("0.00"):
                self.preco_unitario = self._apply_exam_pricing(self.exame.preco)
            if self.iva_percentual is None:
                self.iva_percentual = self._resolve_reference_vat_percentage()
            self.aplica_iva = self._resolve_reference_applies_vat()
            return

        if self.tipo_item == self.TipoItem.EXAME_MEDICO and self.exame_medico_id:
            if not self.descricao.strip():
                self.descricao = self.exame_medico.nome
            if self.preco_unitario == Decimal("0.00"):
                self.preco_unitario = self._apply_exam_pricing(self.exame_medico.preco)
            if self.iva_percentual is None:
                self.iva_percentual = self._resolve_reference_vat_percentage()
            self.aplica_iva = self._resolve_reference_applies_vat()
            return

        if self.tipo_item == self.TipoItem.ITEM_VENDA and self.item_venda_id:
            self.descricao = self.item_venda.produto.nome
            self.quantidade = Decimal(self.item_venda.quantidade)
            self.preco_unitario = self.item_venda.preco_unitario
            if self.iva_percentual is None:
                self.iva_percentual = self._resolve_reference_vat_percentage()
            self.aplica_iva = self._resolve_reference_applies_vat()
            return

        if self.tipo_item == self.TipoItem.PROCEDIMENTO_ITEM and self.procedimento_item_id:
            if not self.descricao.strip():
                self.descricao = self.procedimento_item.descricao
            self.quantidade = Decimal(self.procedimento_item.quantidade)
            try:
                self.preco_unitario = self.procedimento_item.valor.preco_unitario
            except ObjectDoesNotExist:
                self.preco_unitario = self.procedimento_item.preco_unitario
            if self.iva_percentual is None:
                self.iva_percentual = self._resolve_reference_vat_percentage()
            self.aplica_iva = self._resolve_reference_applies_vat()
            return

        if self.tipo_item == self.TipoItem.PROCEDIMENTO_MATERIAL and self.procedimento_material_id:
            if not self.descricao.strip():
                self.descricao = self.procedimento_material.produto.nome
            self.quantidade = Decimal(self.procedimento_material.quantidade)
            try:
                self.preco_unitario = self.procedimento_material.valor.custo_unitario
            except ObjectDoesNotExist:
                self.preco_unitario = self.procedimento_material.custo_unitario
            if self.iva_percentual is None:
                self.iva_percentual = self._resolve_reference_vat_percentage()
            self.aplica_iva = self._resolve_reference_applies_vat()
            return

        if self.tipo_item == self.TipoItem.AJUSTE and self.iva_percentual is None:
            self.iva_percentual = self._resolve_reference_vat_percentage()

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
            raise ValidationError({"preco_unitario": "Preço unitário não pode ser negativo."})

        campo_esperado = tipo_para_campo[self.tipo_item]

        if self.tipo_item == self.TipoItem.AJUSTE:
            if any(referencias.values()):
                raise ValidationError("Item de ajuste manual não pode possuir referência externa.")
            if not self.descricao.strip():
                raise ValidationError({"descricao": "Descrição é obrigatória para ajuste manual."})
        else:
            if not referencias[campo_esperado]:
                raise ValidationError({campo_esperado: "Informe a referência do tipo selecionado."})
            for campo, informado in referencias.items():
                if campo != campo_esperado and informado:
                    raise ValidationError({campo: "Remova esta referência, ela não corresponde ao tipo."})

        origem_esperada = self._origem_esperada()
        if origem_esperada and self.fatura.origem != origem_esperada:
            raise ValidationError("Tipo de item incompatível com a origem selecionada na fatura.")

        if self.inquilino_id and self.fatura_id and self.inquilino_id != self.fatura.inquilino_id:
            raise ValidationError("Item e fatura devem pertencer ao mesmo inquilino.")

        if self.exame_id and self.fatura.requisicao_id:
            existe_no_contexto = self.fatura.requisicao.itens.filter(exame_id=self.exame_id).exists()
            if not existe_no_contexto:
                raise ValidationError({"exame": "Exame não pertence à requisição da fatura."})

        if self.exame_medico_id and self.fatura.requisicao_id:
            existe_no_contexto = self.fatura.requisicao.itens.filter(exame_medico_id=self.exame_medico_id).exists()
            if not existe_no_contexto:
                raise ValidationError({"exame_medico": "Exame médico não pertence à requisição da fatura."})

        if self.item_venda_id and self.fatura.venda_id and self.item_venda.venda_id != self.fatura.venda_id:
            raise ValidationError({"item_venda": "Item de venda não pertence à venda da fatura."})

        if self.procedimento_item_id and self.fatura.origem == self.fatura.Origem.ENFERMAGEM:
            permitido = False
            if self.fatura.procedimento_id and self.procedimento_item.procedimento_id == self.fatura.procedimento_id:
                permitido = True
            if (
                not permitido
                and self.fatura_id
                and self.fatura.procedimentos.filter(pk=self.procedimento_item.procedimento_id).exists()
            ):
                permitido = True
            if not permitido:
                raise ValidationError(
                    {"procedimento_item": "Item de procedimento não pertence aos procedimentos da fatura."}
                )

        if self.procedimento_material_id and self.fatura.origem == self.fatura.Origem.ENFERMAGEM:
            permitido = False
            if (
                self.fatura.procedimento_id
                and self.procedimento_material.procedimento_id == self.fatura.procedimento_id
            ):
                permitido = True
            if (
                not permitido
                and self.fatura_id
                and self.fatura.procedimentos.filter(pk=self.procedimento_material.procedimento_id).exists()
            ):
                permitido = True
            if not permitido:
                raise ValidationError({"procedimento_material": "Material não pertence aos procedimentos da fatura."})

    def save(self, *args, **kwargs):
        if self.fatura.estado != self.fatura.Estado.RASCUNHO:
            raise ValidationError("Não é permitido alterar itens de fatura emitida.")

        if not self.inquilino_id and self.fatura_id:
            self.inquilino_id = self.fatura.inquilino_id

        self._fill_from_reference()
        self.full_clean()

        super().save(*args, **kwargs)
        self._schedule_recalculation()

    def delete(self, *args, **kwargs):
        if self.fatura.estado != self.fatura.Estado.RASCUNHO:
            raise ValidationError("Não é permitido remover itens.")

        fatura = self.fatura
        super().delete(*args, **kwargs)
        fatura.persistir_totais()  # manter estado imediato para gravação local
        self._schedule_recalculation()

    iva_valor = vat_amount
    _schedule_recalculo = _schedule_recalculation
    _data_referencia_precificacao = _pricing_reference_date
    _aplicar_precificacao_exame = _apply_exam_pricing
    _resolver_iva_percentual_referencia = _resolve_reference_vat_percentage
    _resolver_aplica_iva_referencia = _resolve_reference_applies_vat
    _preencher_de_referencia = _fill_from_reference
