"""Itens de fatura (linhas) com preenchimento automático por origem."""

from decimal import ROUND_HALF_UP, Decimal  # Operações monetárias com arredondamento

from django.core.exceptions import ObjectDoesNotExist, ValidationError  # Validações e referências faltantes
from django.core.validators import MaxValueValidator, MinValueValidator  # Validadores numéricos
from django.db import models, transaction  # ORM e transações
from django.db.models import Q  # Constraints condicionais

from apps.consultations.utils.pricing import calculate_price_multiplier  # Multiplicador por horário
from core.models.base import NoNameCoreModel  # Modelo base sem campo name


class InvoiceItem(NoNameCoreModel):
    """Linha de fatura que representa um exame, produto, serviço ou ajuste."""

    prefix = "FTIT"  # Prefixo de IDs amigáveis

    class ItemType(models.TextChoices):
        """Tipos de item suportados pela fatura."""

        EXAME = "EXA", "Exame"
        EXAME_MEDICO = "EXM", "Exame médico"
        ITEM_VENDA = "FAR", "Item de farmácia"
        PROCEDIMENTO_ITEM = "PRC", "Serviço de enfermagem"
        PROCEDIMENTO_MATERIAL = "MAT", "Material de enfermagem"
        CONSULTATION = "CON", "Consulta médica"
        AJUSTE = "AJU", "Ajuste manual"

    TipoItem = ItemType

    invoice = models.ForeignKey(
        "faturamento.Invoice",  # Fatura à qual o item pertence
        db_column="invoice_id",
        verbose_name="Fatura relacionada",
        on_delete=models.CASCADE,  # Remove item se fatura for apagada
        related_name="items",
    )
    item_type = models.CharField(
        db_column="item_type",
        verbose_name="Tipo de item de fatura",
        max_length=3,
        choices=ItemType.choices,  # Restringe aos tipos válidos
        default=ItemType.EXAME,
        db_index=True,
    )

    exam = models.ForeignKey(
        "clinical.LabExam",  # Exame de laboratório
        db_column="exam_id",
        verbose_name="Exame laboratorial",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    medical_exam = models.ForeignKey(
        "clinical.MedicalExam",  # Exame de imagem/consulta médica
        db_column="medical_exam_id",
        verbose_name="Exame médico",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    consultation = models.ForeignKey(
        "consultas.MedicalConsultation",  # Consulta vinculada (quando item_type = CONSULTATION)
        db_column="consultation_id",
        verbose_name="Consulta médica",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    sale_item = models.ForeignKey(
        "farmacia.SaleItem",  # Item de venda da farmácia
        db_column="sale_item_id",
        verbose_name="Item de venda",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    product = models.ForeignKey(
        "farmacia.Product",  # Produto vendido (fallback quando não há sale_item)
        db_column="product_id",
        verbose_name="Produto",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        help_text="Produto vendido (quando não há referência direta ao item da venda).",
    )
    procedure_item = models.ForeignKey(
        "enfermagem.ProcedureItem",  # Serviço de enfermagem
        db_column="procedure_item_id",
        verbose_name="Procedimento de enfermagem",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    procedure_material = models.ForeignKey(
        "enfermagem.ProcedureMaterial",  # Material consumido em enfermagem
        db_column="procedure_material_id",
        verbose_name="Material de procedimento de enfermagem",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )

    description = models.CharField(
        db_column="description",
        verbose_name="Descrição",
        max_length=255,
        blank=True,
        default="",
    )
    quantity = models.DecimalField(
        db_column="quantity",  # Coluna
        verbose_name="Quantidade",
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        help_text="Informe a quantidade do itens. Para itens de venda, a quantidade será preenchida automaticamente a partir do item de venda selecionado.",
    )
    unit_price = models.DecimalField(
        db_column="unit_price",  # Coluna
        verbose_name="Preço unitário",
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Informe o preço unitário do item. Para exames, o preço será preenchido automaticamente a partir do cadastro do exame, podendo ser ajustado para casos específicos.",
    )

    applies_vat = models.BooleanField(

        db_column="applies_vat",

        verbose_name="Aplicar IVA?",
        default=True,
        help_text="Desmarque para não aplicar IVA neste item.",
    )

    vat_percentage = models.DecimalField(

        db_column="vat_percentage",

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
        help_text="Deixe em branco para herdar do item (exam/product/procedure).",
    )

    class Meta:
        db_table = "faturamento_faturaitem"
        verbose_name = "Item de Fatura"
        verbose_name_plural = "Invoice Items"
        constraints = [
            models.UniqueConstraint(
                fields=["invoice", "exam"],
                condition=Q(exam__isnull=False, deleted=False),
                name="unique_exam_por_invoice",
            ),
            models.UniqueConstraint(
                fields=["invoice", "medical_exam"],
                condition=Q(medical_exam__isnull=False, deleted=False),
                name="unique_medical_exam_por_invoice",
            ),
            models.UniqueConstraint(
                fields=["invoice", "consultation"],
                condition=Q(consultation__isnull=False, deleted=False),
                name="unique_consulta_por_invoice",
            ),
            models.UniqueConstraint(
                fields=["invoice", "sale_item"],
                condition=Q(sale_item__isnull=False, deleted=False),
                name="unique_sale_item_por_invoice",
            ),
            models.UniqueConstraint(
                fields=["invoice", "product"],
                condition=Q(product__isnull=False, deleted=False, sale_item__isnull=True),
                name="unique_product_pharmacy_por_invoice",
            ),
            models.UniqueConstraint(
                fields=["invoice", "procedure_item"],
                condition=Q(procedure_item__isnull=False, deleted=False),
                name="unique_proc_item_por_invoice",
            ),
            models.UniqueConstraint(
                fields=["invoice", "procedure_material"],
                condition=Q(procedure_material__isnull=False, deleted=False),
                name="unique_proc_material_por_invoice",
            ),
        ]

    @property
    def total(self):
        return (self.unit_price or Decimal("0.00")) * (self.quantity or Decimal("0.00"))

    @property
    def total_sem_iva(self) -> Decimal:
        return self.total or Decimal("0.00")

    @property
    def vat_amount(self) -> Decimal:
        if not self.applies_vat:
            return Decimal("0.00")
        base = self.total_sem_iva or Decimal("0.00")
        perc = self.vat_percentage
        if perc is None or perc == "":
            perc = Decimal("0.00")
        try:
            value = base * (Decimal(perc) / Decimal("100.00"))
            return value.quantize(Decimal("0.01"))
        except Exception:
            return Decimal("0.00")

    @property
    def total_com_iva(self) -> Decimal:
        return (self.total_sem_iva or Decimal("0.00")) + (self.vat_amount or Decimal("0.00"))

    @property
    def billed_sector(self) -> str:
        """Retorna o setor funcional do item faturado para auditoria/listagem."""
        if self.exam_id:
            return getattr(self.exam, "get_sector_display", lambda: None)() or str(getattr(self.exam, "sector", ""))

        if self.medical_exam_id:
            return getattr(self.medical_exam, "get_sector_display", lambda: None)() or str(
                getattr(self.medical_exam, "sector", "")
            )

        if self.item_type == self.TipoItem.ITEM_VENDA:
            return "Farmácia"

        if self.item_type in {self.TipoItem.PROCEDIMENTO_ITEM, self.TipoItem.PROCEDIMENTO_MATERIAL}:
            return "Enfermagem"

        if self.item_type == self.TipoItem.CONSULTATION:
            specialty = getattr(getattr(self, "consultation", None), "specialty", None)
            if specialty is not None and getattr(specialty, "name", ""):
                return f"Consulta ({specialty.name})"
            return "Consulta"

        if self.item_type == self.TipoItem.AJUSTE:
            return "Ajuste manual"

        return self.get_item_type_display() or "-"

    def _schedule_recalculation(self):
        try:
            from tasks.billing.recalculation import recalculate_invoice_task
        except ImportError:
            return

        invoice_id = getattr(self, "invoice_id", None)
        if not invoice_id:
            return

        def _enqueue():
            try:
                recalculate_invoice_task.delay(invoice_id)
                return
            except Exception:
                # Fallback local quando o broker não está disponível.
                try:
                    from apps.billing.models.invoice import Invoice

                    invoice = Invoice.objects.filter(pk=invoice_id).first()
                    if invoice:
                        invoice.persist_totals()
                except Exception:
                    pass

        try:
            transaction.on_commit(_enqueue)
        except Exception:
            _enqueue()

    def _origin_esperada(self):
        try:
            if self.invoice_id and self.invoice.origin == self.invoice.Origin.MIXED:
                return None
        except Exception:
            pass
        return {
            self.TipoItem.EXAME: self.invoice.Origin.CLINICAL,
            self.TipoItem.EXAME_MEDICO: self.invoice.Origin.CLINICAL,
            self.TipoItem.ITEM_VENDA: self.invoice.Origin.PHARMACY,
            self.TipoItem.PROCEDIMENTO_ITEM: self.invoice.Origin.NURSING,
            self.TipoItem.PROCEDIMENTO_MATERIAL: self.invoice.Origin.NURSING,
            self.TipoItem.AJUSTE: None,
        }[self.item_type]

    def _pricing_reference_date(self):
        if not self.invoice_id:
            return None

        request = getattr(self.invoice, "request", None)
        if request and getattr(request, "created_at", None):
            return request.created_at

        return getattr(self.invoice, "created_at", None)

    def _apply_exam_pricing(self, base_price: Decimal) -> Decimal:
        if base_price is None:
            return Decimal("0.00")

        date_ref = self._pricing_reference_date()
        if not date_ref:
            return base_price

        try:
            tenant = getattr(self.invoice, "tenant", None) or getattr(self, "tenant", None)
            multiplier = calculate_price_multiplier(tenant, date_ref, manual_holiday=False)
            return (base_price * multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except Exception:
            return base_price

    def _resolve_reference_vat_percentage(self) -> Decimal:
        """
        Resolve IVA (%) a partir da referência do item.
        Mantém 16% como padrão defensivo (compatível com o comportamento anterior),
        permitindo configurar IVA individual por item no catálogo.
        """
        if self.item_type == self.TipoItem.EXAME and self.exam_id:
            return getattr(self.exam, "vat_percentage", None) or Decimal("0.00")

        if self.item_type == self.TipoItem.EXAME_MEDICO and self.medical_exam_id:
            return getattr(self.medical_exam, "vat_percentage", None) or Decimal("0.00")

        if self.item_type == self.TipoItem.ITEM_VENDA and self.sale_item_id:
            product = getattr(self.sale_item, "product", None)
            return getattr(product, "vat_percentage", None) or Decimal("0.00")

        if self.item_type == self.TipoItem.PROCEDIMENTO_ITEM and self.procedure_item_id:
            catalog = getattr(self.procedure_item, "catalog", None)
            if catalog is not None:
                return getattr(catalog, "vat_percentage", None) or Decimal("0.00")
            return Decimal("16.00")

        if self.item_type == self.TipoItem.PROCEDIMENTO_MATERIAL and self.procedure_material_id:
            product = getattr(self.procedure_material, "product", None)
            return getattr(product, "vat_percentage", None) or Decimal("0.00")

        if self.item_type == self.TipoItem.AJUSTE:
            return Decimal("16.00")

        return Decimal("0.00")

    def _resolve_reference_applies_vat(self) -> bool:
        if self.item_type == self.TipoItem.EXAME and self.exam_id:
            return getattr(self.exam, "applies_vat_by_default", True)

        if self.item_type == self.TipoItem.EXAME_MEDICO and self.medical_exam_id:
            return getattr(self.medical_exam, "applies_vat_by_default", True)

        if self.item_type == self.TipoItem.ITEM_VENDA and self.sale_item_id:
            product = getattr(self.sale_item, "product", None)
            return getattr(product, "applies_vat_by_default", True)

        if self.item_type == self.TipoItem.PROCEDIMENTO_ITEM and self.procedure_item_id:
            catalog = getattr(self.procedure_item, "catalog", None)
            if catalog is not None:
                return getattr(catalog, "applies_vat_by_default", True)
            return True

        if self.item_type == self.TipoItem.PROCEDIMENTO_MATERIAL and self.procedure_material_id:
            product = getattr(self.procedure_material, "product", None)
            return getattr(product, "applies_vat_by_default", True)

        if self.item_type == self.TipoItem.AJUSTE:
            return True

        return True

    def _fill_from_reference(self):
        if self.item_type == self.TipoItem.EXAME and self.exam_id:
            if not self.description.strip():
                self.description = self.exam.name
            if self.unit_price == Decimal("0.00"):
                self.unit_price = self._apply_exam_pricing(self.exam.price)
            if self.vat_percentage is None:
                self.vat_percentage = self._resolve_reference_vat_percentage()
            self.applies_vat = self._resolve_reference_applies_vat()
            return

        if self.item_type == self.TipoItem.EXAME_MEDICO and self.medical_exam_id:
            if not self.description.strip():
                self.description = self.medical_exam.name
            if self.unit_price == Decimal("0.00"):
                self.unit_price = self._apply_exam_pricing(self.medical_exam.price)
            if self.vat_percentage is None:
                self.vat_percentage = self._resolve_reference_vat_percentage()
            self.applies_vat = self._resolve_reference_applies_vat()
            return

        if self.item_type == self.TipoItem.ITEM_VENDA and self.sale_item_id:
            self.description = self.sale_item.product.name
            self.quantity = Decimal(self.sale_item.quantity)
            self.unit_price = self.sale_item.unit_price
            if self.vat_percentage is None:
                self.vat_percentage = self._resolve_reference_vat_percentage()
            self.applies_vat = self._resolve_reference_applies_vat()
            return

        if self.item_type == self.TipoItem.PROCEDIMENTO_ITEM and self.procedure_item_id:
            if not self.description.strip():
                self.description = self.procedure_item.description
            self.quantity = Decimal(self.procedure_item.quantity)
            try:
                self.unit_price = self.procedure_item.value.unit_price
            except ObjectDoesNotExist:
                self.unit_price = self.procedure_item.unit_price
            if self.vat_percentage is None:
                self.vat_percentage = self._resolve_reference_vat_percentage()
            self.applies_vat = self._resolve_reference_applies_vat()
            return

        if self.item_type == self.TipoItem.PROCEDIMENTO_MATERIAL and self.procedure_material_id:
            if not self.description.strip():
                self.description = self.procedure_material.product.name
            self.quantity = Decimal(self.procedure_material.quantity)
            try:
                self.unit_price = self.procedure_material.value.unit_cost
            except ObjectDoesNotExist:
                self.unit_price = self.procedure_material.unit_cost
            if self.vat_percentage is None:
                self.vat_percentage = self._resolve_reference_vat_percentage()
            self.applies_vat = self._resolve_reference_applies_vat()
            return

        if self.item_type == self.TipoItem.AJUSTE and self.vat_percentage is None:
            self.vat_percentage = self._resolve_reference_vat_percentage()

    def clean(self):
        super().clean()

        referencias = {
            "exam": bool(self.exam_id),
            "medical_exam": bool(self.medical_exam_id),
            "sale_item": bool(self.sale_item_id),
            "product": bool(getattr(self, "product_id", None)),
            "procedure_item": bool(self.procedure_item_id),
            "procedure_material": bool(self.procedure_material_id),
        }
        type_para_campo = {
            self.TipoItem.EXAME: "exam",
            self.TipoItem.EXAME_MEDICO: "medical_exam",
            self.TipoItem.ITEM_VENDA: "product",
            self.TipoItem.PROCEDIMENTO_ITEM: "procedure_item",
            self.TipoItem.PROCEDIMENTO_MATERIAL: "procedure_material",
            self.TipoItem.AJUSTE: None,
        }

        if self.quantity <= 0:
            raise ValidationError({"quantity": "Quantidade deve ser maior que zero."})
        if self.unit_price < Decimal("0.00"):
            raise ValidationError({"unit_price": "Preço unitário não pode ser negativo."})

        campo_esperado = type_para_campo[self.item_type]

        if self.item_type == self.TipoItem.AJUSTE:
            if any(referencias.values()):
                raise ValidationError("Item de ajuste manual não pode possuir referência externa.")
            if not self.description.strip():
                raise ValidationError({"description": "Descrição é obrigatória para ajuste manual."})
        else:
            if not referencias[campo_esperado]:
                raise ValidationError({campo_esperado: "Informe a referência do type selecionado."})
            for campo, informado in referencias.items():
                if campo != campo_esperado and informado:
                    raise ValidationError({campo: "Remova esta referência, ela não corresponde ao type."})

        # Regra de negócio: a origem da fatura é apenas classificatória;
        # não bloqueamos criação/edição de itens por tipo.

        if self.tenant_id and self.invoice_id and self.tenant_id != self.invoice.tenant_id:
            raise ValidationError("Item e invoice devem pertencer ao mesmo tenant.")

        if self.exam_id and self.invoice.request_id:
            existe_no_contexto = self.invoice.request.items.filter(exam_id=self.exam_id).exists()
            if not existe_no_contexto:
                raise ValidationError({"exam": "Exame não pertence à requisição da invoice."})

        if self.medical_exam_id and self.invoice.request_id:
            existe_no_contexto = self.invoice.request.items.filter(medical_exam_id=self.medical_exam_id).exists()
            if not existe_no_contexto:
                raise ValidationError({"medical_exam": "Exame médico não pertence à requisição da invoice."})

        if self.sale_item_id and self.invoice.sale_id and self.sale_item.sale_id != self.invoice.sale_id:
            raise ValidationError({"sale_item": "Item de sale não pertence à sale da invoice."})

        if self.procedure_item_id and self.invoice.origin == self.invoice.Origin.NURSING:
            permitido = False
            if self.invoice.procedure_id and self.procedure_item.procedure_id == self.invoice.procedure_id:
                permitido = True
            if (
                not permitido
                and self.invoice_id
                and self.invoice.procedures.filter(pk=self.procedure_item.procedure_id).exists()
            ):
                permitido = True
            if not permitido:
                raise ValidationError(
                    {"procedure_item": "Item de procedure não pertence aos procedures da invoice."}
                )

        if self.procedure_material_id and self.invoice.origin == self.invoice.Origin.NURSING:
            permitido = False
            if (
                self.invoice.procedure_id
                and self.procedure_material.procedure_id == self.invoice.procedure_id
            ):
                permitido = True
            if (
                not permitido
                and self.invoice_id
                and self.invoice.procedures.filter(pk=self.procedure_material.procedure_id).exists()
            ):
                permitido = True
            if not permitido:
                raise ValidationError({"procedure_material": "Material não pertence aos procedures da invoice."})

    def save(self, *args, **kwargs):
        if self.invoice.status != self.invoice.Status.DRAFT:
            raise ValidationError("Not allowed to change items of an issued invoice.")

        if not self.tenant_id and self.invoice_id:
            self.tenant_id = self.invoice.tenant_id

        self._fill_from_reference()
        self.full_clean()

        super().save(*args, **kwargs)
        self.invoice.persist_totals()
        self._schedule_recalculation()

    def delete(self, *args, **kwargs):
        if self.invoice.status != self.invoice.Status.DRAFT:
            raise ValidationError("Not allowed to remove items.")

        invoice = self.invoice
        super().delete(*args, **kwargs)
        invoice.persist_totals()  # manter status imediato para gravação local
        self._schedule_recalculation()

    vat_amount = vat_amount
    _schedule_recalculo = _schedule_recalculation
    _date_referencia_precificacao = _pricing_reference_date
    _aplicar_precificacao_exam = _apply_exam_pricing
    _resolver_vat_percentage_referencia = _resolve_reference_vat_percentage
    _resolver_applies_vat_referencia = _resolve_reference_applies_vat
    _preencher_de_referencia = _fill_from_reference
