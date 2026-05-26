from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction

from apps.pharmacy.models.lot import Lot
from core.mixins.model.position import ScopedPositionMixin
from core.models.base import NoNameCoreModel


class ProcedureItem(ScopedPositionMixin, NoNameCoreModel):
    """Serviço (ato) realizado dentro de um procedimento de enfermagem."""
    prefix = "PROCIT"

    class ExecutionStatus(models.TextChoices):
        PENDING = "PEN", "Pendente"
        EXECUTED = "EXE", "Executado"
        COMPLETED = "CON", "Concluído"
        NOT_COMPLETED = "NCO", "Não concluído"

    procedure = models.ForeignKey(

        "enfermagem.Procedure",

        db_column="procedure_id",
        on_delete=models.CASCADE,
        related_name="itens",
        db_index=True,
        verbose_name="Procedimento",
    )
    catalog = models.ForeignKey(
        "enfermagem.ProcedureCatalog",
        db_column="catalog_id",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="itens_lancados",
        db_index=True,
        verbose_name="Catálogo do Procedimento",
    )
    description = models.CharField(
        db_column="description",
        max_length=255, blank=True, default="", db_index=True)
    quantity = models.PositiveIntegerField(
        db_column="quantity",
        default=1, verbose_name="Quantidade",
        validators=[MinValueValidator(1)],
    )
    unit_price = models.DecimalField(
        db_column="unit_price",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Preço Unitário",
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    performed = models.BooleanField(
        db_column="performed",
        default=True, db_index=True, verbose_name="Realizado"
    )
    execution_status = models.CharField(
        db_column="execution_status",
        max_length=3,
        choices=ExecutionStatus.choices,
        default=ExecutionStatus.PENDING,
        db_index=True,
    )
    billed = models.BooleanField(
        db_column="billed",
        default=False,
        db_index=True,
        verbose_name="Faturado",
    )
    billed_at = models.DateTimeField(
        db_column="billed_at",
        null=True,
        blank=True,
    )
    executed_at = models.DateTimeField(
        db_column="executed_at",
        null=True,
        blank=True,
        verbose_name="Executado em",
    )
    completed_at = models.DateTimeField(
        db_column="completed_at",
        null=True,
        blank=True,
        verbose_name="Concluído em",
    )
    observation = models.TextField(
        db_column="observation",
        blank=True, default="",
        verbose_name="Observação"
    )

    class Meta:
        db_table = "enfermagem_procedimentoitem"
        ordering = ["procedure", "position", "id"]
        verbose_name = "Procedimento de Enfermagem - Item"
        verbose_name_plural = "Procedimentos de Enfermagem - Itens"
        indexes = [
            models.Index(fields=["tenant", "procedure"]),
            models.Index(fields=["catalog"]),
            models.Index(fields=["description"]),
            models.Index(fields=["execution_status"]),
            models.Index(fields=["billed"]),
        ]

    position_scope_fields = ("procedure",)

    def clean(self):
        super().clean()
        if self.quantity <= 0:
            raise ValidationError({"quantity": "Quantidade deve ser maior que zero."})
        if self.unit_price is not None and self.unit_price < Decimal("0.00"):
            raise ValidationError({"unit_price": "Preço unitário não pode ser negativo."})

        description_informada = bool((self.description or "").strip())
        if not self.catalog_id and not description_informada:
            raise ValidationError({"description": "Informe a descrição ou selecione um procedure do catálogo."})

        if self.procedure_id and self.catalog_id and self.procedure.tenant_id != self.catalog.tenant_id:
            raise ValidationError({"catalog": "Catálogo e procedure devem pertencer ao mesmo tenant."})

        # P1.4: Validação cruzada - patient.tenant == item.tenant
        if self.procedure_id and self.procedure.patient_id and self.tenant_id != self.procedure.patient.tenant_id:
            raise ValidationError(
                {"tenant": "Item deve pertencer ao mesmo tenant do paciente."}
            )

        # P1.2: Validar timing - executed_at < billed_at
        if self.executed_at and self.billed_at and self.billed_at < self.executed_at:
            raise ValidationError(
                {"billed_at": "Data de faturamento não pode ser anterior à data de execução."}
            )

        # P1.2: Validar que completed_at >= executed_at
        if self.executed_at and self.completed_at and self.completed_at < self.executed_at:
            raise ValidationError(
                {"completed_at": "Data de conclusão não pode ser anterior à data de execução."}
            )

        if self.pk:
            original = self.__class__.all_objects.get(pk=self.pk)

            if original.catalog_id != self.catalog_id:
                raise ValidationError({"catalog": "Catálogo do item não pode ser alterado após criação."})

            if original.procedure_id != self.procedure_id:
                raise ValidationError({"procedure": "Procedimento do item não pode ser alterado."})

            # P0.1: CRÍTICO - Proteger alterações após faturamento
            if original.billed:
                if original.quantity != self.quantity:
                    raise ValidationError(
                        {"quantity": "Item já faturado é imutável. Estorno requerido para alterações."}
                    )
                if original.unit_price != self.unit_price:
                    raise ValidationError(
                        {"unit_price": "Item já faturado é imutável. Estorno requerido para alterações."}
                    )

            if original.quantity != self.quantity and self.materiais_gerados.exists():
                raise ValidationError(
                    {"quantity": "Quantidade não pode ser alterada após gerar materiais. Remova e recrie o item."}
                )

    @property
    def total_linha(self):
        try:
            price = self.value.unit_price
        except ObjectDoesNotExist:
            price = self.unit_price or Decimal("0.00")

        return (self.quantity or 0) * (price or Decimal("0.00"))

    def _apply_catalog_defaults(self):
        if not self.catalog_id:
            return

        if not (self.description or "").strip():
            self.description = self.catalog.name

    def _resolver_unit_price(self):
        if self.catalog_id:
            return self.catalog.default_price or Decimal("0.00")

        if self.unit_price and self.unit_price > 0:
            return self.unit_price

        try:
            return self.value.unit_price
        except ObjectDoesNotExist:
            return Decimal("0.00")

    def _upsert_value(self):
        from apps.nursing.models.procedure_item_value import (
            ProcedureItemValue,
        )

        price = self._resolver_unit_price()

        value, created = ProcedureItemValue.all_objects.get_or_create(
            item=self,
            defaults={
                "tenant_id": self.tenant_id,
                "unit_price": price,
            },
        )

        if not created and (value.tenant_id != self.tenant_id or value.unit_price != price):
            value.tenant_id = self.tenant_id
            value.unit_price = price
            value.save(update_fields=["tenant", "unit_price", "updated_at"])

        if self.unit_price != price:
            self.__class__.all_objects.filter(pk=self.pk).update(unit_price=price)
            self.unit_price = price

    def _generate_default_materials(self):
        if not self.catalog_id:
            return

        from apps.nursing.models.procedure_material import (
            ProcedureMaterial,
        )

        materiais = self.catalog.materiais_padrao.select_related("product").all()
        for material_padrao in materiais:
            quantity_material = material_padrao.default_quantity * Decimal(self.quantity or 0)
            if quantity_material <= 0:
                continue

            # ProcedimentoMaterial.quantity é inteiro (unidades). Mantemos uma validação
            # defensiva aqui para evitar truncamento silencioso.
            if quantity_material % 1 != 0:
                raise ValidationError(
                    {
                        "catalog": (
                            f"Quantidade do material padrão '{material_padrao.product.name}' "
                            f"deve ser inteira (configuração do catálogo)."
                        )
                    }
                )
            quantity_material_int = int(quantity_material)

            lot = (
                Lot.available(material_padrao.product)
                .filter(tenant_id=self.tenant_id)
                .filter(saldo__gte=quantity_material_int)
                .first()
            )

            cost = material_padrao.default_unit_cost
            if cost in (None, Decimal("0.00")):
                cost = lot.sale_price if lot else material_padrao.product.sale_price

            if lot is None:
                # Permite criar a requisição do procedure mesmo com falta de estoque.
                # A baixa de estoque será exigida no momento da invoiceção/emissão.
                material = ProcedureMaterial(
                    tenant=self.tenant,
                    procedure=self.procedure,
                    procedure_item=self,
                    product=material_padrao.product,
                    lot=None,
                    quantity=quantity_material_int,
                    unit_cost=cost,
                    observation=material_padrao.observation,
                )
                material.save(alocar_estoque=False)
            else:
                ProcedureMaterial.objects.create(
                    tenant=self.tenant,
                    procedure=self.procedure,
                    procedure_item=self,
                    product=material_padrao.product,
                    lot=lot,
                    quantity=quantity_material_int,
                    unit_cost=cost,
                    observation=material_padrao.observation,
                )

    @transaction.atomic
    def save(self, *args, **kwargs):
        criando = self.pk is None

        if not self.tenant_id and self.procedure_id:
            self.tenant_id = self.procedure.tenant_id

        if self.execution_status in {self.ExecutionStatus.EXECUTED, self.ExecutionStatus.COMPLETED}:
            self.performed = True
        elif self.execution_status == self.ExecutionStatus.NOT_COMPLETED:
            self.performed = False

        self._apply_catalog_defaults()
        self.full_clean()

        super().save(*args, **kwargs)

        if criando:
            self._generate_default_materials()

        self._upsert_value()
        self.procedure.recalculate_totals()
        self.procedure.sync_status_from_items()

    @transaction.atomic
    def delete(self, *args, **kwargs):
        procedure = self.procedure

        for material in self.materiais_gerados.filter(deleted=False):
            material.delete()

        try:
            value = self.value
        except ObjectDoesNotExist:
            value = None

        if value and not value.deleted:
            value.delete()

        super().delete(*args, **kwargs)
        procedure.recalculate_totals()
        procedure.sync_status_from_items()

    @transaction.atomic
    def mark_billed(self):
        # P0.2: CRÍTICO - Corrigir lógica: NOT_COMPLETED nunca pode ser faturado
        if self.execution_status == self.ExecutionStatus.NOT_COMPLETED:
            raise ValidationError(
                {
                    "billed": (
                        "Procedimento não-concluído não pode mais ser faturado. "
                        "Apenas itens EXECUTADOS ou CONCLUÍDOS podem ser faturados."
                    )
                }
            )

        if self.execution_status == self.ExecutionStatus.PENDING:
            raise ValidationError(
                {"billed": "Procedimento ainda não foi executado. Marque como executado antes de faturar."}
            )

        if self.billed:
            return

        from django.utils import timezone

        self.billed = True
        self.billed_at = timezone.now()
        self.save(update_fields=["billed", "billed_at", "updated_at"])

    @transaction.atomic
    def mark_executed(self, professional=None):
        if self.execution_status != self.ExecutionStatus.PENDING:
            raise ValidationError(
                {"execution_status": "Apenas procedimentos pendentes podem ser marcados como executados."}
            )

        from django.utils import timezone

        self.execution_status = self.ExecutionStatus.EXECUTED
        self.executed_at = timezone.now()
        self.save(update_fields=["execution_status", "executed_at", "performed", "updated_at"])

        if professional is not None:
            self.procedure.professional.add(professional)
            self.procedure.save(update_fields=["updated_at"])

    @transaction.atomic
    def mark_completed(self):
        if self.execution_status != self.ExecutionStatus.EXECUTED:
            raise ValidationError({"execution_status": "Apenas procedimentos executados podem ser concluídos."})

        from django.utils import timezone

        self.execution_status = self.ExecutionStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["execution_status", "completed_at", "performed", "updated_at"])

    @transaction.atomic
    def mark_not_completed(self):
        if self.execution_status != self.ExecutionStatus.EXECUTED:
            raise ValidationError(
                {"execution_status": "Apenas procedimentos executados podem ser marcados como não concluídos."}
            )

        from django.utils import timezone

        self.execution_status = self.ExecutionStatus.NOT_COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["execution_status", "completed_at", "performed", "updated_at"])

    def __str__(self):
        return f"{self.description} x{self.quantity}"


ProcedureItem._aplicar_defaults_catalog = ProcedureItem._apply_catalog_defaults
ProcedureItem._upsert_value = ProcedureItem._upsert_value
