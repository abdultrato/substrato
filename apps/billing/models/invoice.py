"""Modelo de fatura com cálculo de totais e sincronização por origem."""

from contextlib import suppress  # Evita exceções em blocos opcionais
from decimal import Decimal  # Precisão para valores monetários

from django.core.exceptions import ValidationError  # Exceções de validação
from django.db import models, transaction  # ORM e controle transacional
from django.db.models import DecimalField, Sum  # Agregações numéricas
from django.db.models.functions import Coalesce  # Substitui None por zero
from django.utils import timezone

from apps.clinical.models.lab_request import LabRequest  # Requisição de exames
from apps.clinical.models.patient import Patient  # Paciente ligado à fatura
from core.models.base import NoNameCoreModel  # Modelo base sem campo name


class Invoice(NoNameCoreModel):
    """Fatura consolidando itens de diversas origens (clínica, farmácia, etc.)."""

    prefix = "FAT"  # Prefixo para IDs amigáveis

    class Status(models.TextChoices):
        """Estados possíveis da fatura."""

        DRAFT = "RASC", "Rascunho"
        ISSUED = "EMIT", "Emitida"
        PAID = "PAGA", "Paga"
        CANCELED = "CANC", "Cancelada"

    class Origin(models.TextChoices):
        """Origem do faturamento (controla sincronização de itens)."""

        CLINICAL = "CLI", "Clínico"
        PHARMACY = "FAR", "Farmácia"
        NURSING = "ENF", "Enfermagem"
        CONSULTATION = "CON", "Consulta"
        SURGERY = "CIR", "Cirurgia"
        MIXED = "MIX", "Mista"

    origin = models.CharField(
        db_column="origin",  # Coluna
        verbose_name="Origem",
        max_length=3,
        choices=Origin.choices,  # Restringe às origens válidas
        default=Origin.CLINICAL,
        db_index=True,
    )

    request = models.OneToOneField(
        LabRequest,  # Requisição laboratorial (origem clínica)
        db_column="request_id",
        verbose_name="Requisição",
        on_delete=models.PROTECT,  # Preserva fatura/histórico se houver requisição vinculada
        related_name="invoice",
        null=True,
        blank=True,
    )
    sale = models.OneToOneField(
        "farmacia.Sale",  # Venda da farmácia
        db_column="sale_id",
        verbose_name="Venda",
        on_delete=models.PROTECT,  # Protege venda faturada
        related_name="invoice",
        null=True,
        blank=True,
    )
    procedure = models.ForeignKey(
        "enfermagem.Procedure",  # Procedimento único (legado)
        db_column="procedure_id",
        verbose_name="Procedimento (legado)",
        on_delete=models.PROTECT,
        related_name="invoices_legacy",
        null=True,
        blank=True,
        help_text="Legado: prefira usar o campo 'procedures' (múltiplos).",
    )
    procedures = models.ManyToManyField(
        "enfermagem.Procedure",  # Procedimentos múltiplos (novo fluxo)
        db_table="faturamento_fatura_procedimentos",
        verbose_name="Procedimentos (Enfermagem)",
        blank=True,
        related_name="invoices",
        help_text="Pode associar múltiplos procedimentos de enfermagem à mesma fatura.",
    )
    consultations = models.ManyToManyField(
        "consultas.MedicalConsultation",  # Consultas múltiplas
        db_table="faturamento_fatura_consultas",
        verbose_name="Consultas médicas",
        blank=True,
        related_name="invoices",
        help_text="Associa várias consultas (ex.: clínica geral e especialidade) a esta fatura.",
    )
    consultation = models.OneToOneField(
        "consultas.MedicalConsultation",  # Consulta única (compatibilidade)
        db_column="consultation_id",
        verbose_name="Consulta",
        on_delete=models.PROTECT,
        related_name="invoice",
        null=True,
        blank=True,
    )
    surgery = models.OneToOneField(
        "cirurgia.Surgery",  # Cirurgia associada
        db_column="surgery_id",
        verbose_name="Cirurgia",
        on_delete=models.PROTECT,
        related_name="invoice",
        null=True,
        blank=True,
    )

    patient = models.ForeignKey(
        Patient,  # Paciente associado
        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,  # Evita excluir paciente com fatura
        related_name="invoices",
        null=True,
        blank=True,
    )

    # ── Cliente fiscal (quem paga) — pode ser empresa/seguradora/escola/ONG/
    # hospital, distinto do paciente. Por omissão, o paciente é o cliente fiscal.
    fiscal_client = models.ForeignKey(
        "entidades.Company",
        db_column="fiscal_client_id",
        verbose_name="Cliente fiscal (entidade)",
        on_delete=models.PROTECT,
        related_name="invoices_as_fiscal_client",
        null=True,
        blank=True,
        db_index=True,
    )
    fiscal_client_name = models.CharField(
        "Cliente fiscal (nome)",
        db_column="fiscal_client_name",
        max_length=200,
        blank=True,
        default="",
    )
    fiscal_client_nuit = models.CharField(
        "Cliente fiscal (NUIT)",
        db_column="fiscal_client_nuit",
        max_length=30,
        blank=True,
        default="",
    )
    fiscal_client_address = models.TextField(
        "Cliente fiscal (morada)",
        db_column="fiscal_client_address",
        blank=True,
        default="",
    )

    subtotal = models.DecimalField(  # Soma sem impostos
        verbose_name="Total sem IVA",
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    vat_amount = models.DecimalField(
        db_column="vat_amount",
        verbose_name="Total de IVA",
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    total = models.DecimalField(  # Total com impostos
        verbose_name="Total com IVA",
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    insurance_amount = models.DecimalField(
        db_column="insurance_amount",  # Parcela coberta pelo seguro
        verbose_name="Valor do seguro",
        max_digits=12,
        decimal_places=2,
        default=0,
    )
    patient_amount = models.DecimalField(
        db_column="patient_amount",  # Parcela cobrada ao paciente
        verbose_name="Valor do paciente",
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    status = models.CharField(
        db_column="status",  # Coluna
        verbose_name="Estado",
        max_length=5,
        choices=Status.choices,  # Estados permitidos
        default=Status.DRAFT,
        db_index=True,
    )

    class Meta:
        db_table = "faturamento_fatura"
        verbose_name = "Fatura"
        verbose_name_plural = "Faturas"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "origin", "status", "created_at"]),
            models.Index(fields=["tenant", "patient", "created_at"]),
        ]

    # ==========================================
    # RECÁLCULO FINANCEIRO
    # ==========================================

    def register_history(self, event_type: str, titulo: str, linhas: list[str] | None = None) -> None:
        """
        Registra histórico textual com formatação linha-a-linha.
        """
        from apps.billing.models.invoice_history import InvoiceHistory

        parts: list[str] = [titulo]
        if linhas:
            for linha in linhas:
                texto = str(linha).strip()
                if texto:
                    parts.append(texto)

        InvoiceHistory.objects.create(
            tenant=self.tenant,
            name=titulo,
            invoice=self,
            description="\n".join(parts).strip(),
            event_type=event_type,
        )

    def recalculate_totals(self):
        items = list(self.items.filter(deleted=False))

        subtotal = sum((item.total_sem_iva for item in items), Decimal("0.00")).quantize(Decimal("0.01"))
        iva = sum((item.vat_amount for item in items), Decimal("0.00")).quantize(Decimal("0.01"))
        total = (subtotal + iva).quantize(Decimal("0.01"))

        self.subtotal = subtotal
        self.vat_amount = iva
        self.total = total
        insurance_amount = self.insurance_amount or Decimal("0.00")
        if insurance_amount > total:
            insurance_amount = total
        self.insurance_amount = insurance_amount
        self.patient_amount = max(total - insurance_amount, Decimal("0.00"))

    # ==========================================
    # VALIDAÇÃO DE ORIGEM
    # ==========================================

    def persist_totals(self):
        self.recalculate_totals()
        if not self.pk:
            return
        self.__class__.all_objects.filter(pk=self.pk).update(
            subtotal=self.subtotal,
            vat_amount=self.vat_amount,
            total=self.total,
            insurance_amount=self.insurance_amount,
            patient_amount=self.patient_amount,
        )

    @property
    def total_a_pagar(self) -> Decimal:
        """Total final da fatura (com IVA)."""
        try:
            return Decimal(self.total or Decimal("0.00")).quantize(Decimal("0.01"))
        except Exception:
            return Decimal("0.00")

    @property
    def valor_a_pagar(self) -> Decimal:
        """Alias em português para compatibilidade."""
        return self.total_a_pagar

    def confirmed_paid_amount(self):
        from apps.payments.models.payment import Payment

        totais = self.pagamentos.filter(
            status=Payment.Status.CONFIRMED,
            deleted=False,
        ).aggregate(
            total_pago=Coalesce(
                Sum(
                    "value",
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                Decimal("0.00"),
            ),
            total_troco=Coalesce(
                Sum(
                    "change_amount",
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                Decimal("0.00"),
            ),
        )
        return (totais["total_pago"] or Decimal("0.00")) - (totais["total_troco"] or Decimal("0.00"))

    def _default_receipt_number(self, payment):
        # Um recibo é gerado quando a invoice fica totalmente paga. O número
        # precisa ser estável e rastreável pela invoice (não pelo payment
        # parcial), mas mantemos referência do payment que fechou a invoice.
        fat_ref = self.custom_id or self.pk
        pag_ref = getattr(payment, "custom_id", None) or getattr(payment, "pk", None)
        if pag_ref:
            return f"REC-{fat_ref}-{pag_ref}"
        return f"REC-{fat_ref}"

    def generate_automatic_receipt(self, payment):
        if not payment or payment.status != payment.Status.CONFIRMED:
            return None

        from apps.payments.models.receipt import Receipt

        # Garante 1 recibo por invoice (mesmo que existam pagamentos parciais).
        # Se já existir, sincroniza o payment de referência + value.
        recibo = (
            Receipt.objects.filter(invoice=self).order_by("-created_at", "-id").first()
            or Receipt.objects.filter(payment=payment).order_by("-created_at", "-id").first()
        )

        if recibo:
            campos_atualizar = []
            if recibo.invoice_id != self.pk:
                recibo.invoice = self
                campos_atualizar.append("invoice")
            if recibo.value != self.total_a_pagar:
                # O recibo representa o payment total da invoice (não só o
                # último payment).
                recibo.value = self.total_a_pagar
                campos_atualizar.append("value")
            if recibo.payment_id != payment.pk:
                recibo.payment = payment
                campos_atualizar.append("payment")

            number = self._default_receipt_number(payment)
            if recibo.number != number:
                recibo.number = number
                campos_atualizar.append("number")

            if campos_atualizar:
                recibo.save(update_fields=campos_atualizar)

            return recibo

        return Receipt.objects.create(
            invoice=self,
            payment=payment,
            number=self._default_receipt_number(payment),
            value=self.total_a_pagar,
        )

    def update_payment_status(self, payment=None):
        if self.status in {self.Status.DRAFT, self.Status.CANCELED}:
            return

        total_paid = self.confirmed_paid_amount() or Decimal("0.00")
        total_invoice = self.total_a_pagar
        novo_status = (
            self.Status.PAID if total_paid >= total_invoice and total_invoice > Decimal("0.00") else self.Status.ISSUED
        )

        if novo_status == self.Status.PAID and payment is not None:
            self.generate_automatic_receipt(payment)

        if self.status != novo_status:
            self.status = novo_status
            self.save(update_fields=["status"])
            try:
                linhas = [
                    f"Novo status: {self.get_status_display()}",
                    f"Total com IVA: {self.total:.2f}",
                    f"Total pago confirmed: {(total_paid or Decimal('0.00')):.2f}",
                ]
                self.register_history("PAGAMENTO", "Estado de payment atualizado", linhas=linhas)
            except Exception:
                pass

    # ==========================================
    # ORIGEM
    # ==========================================

    @property
    def source_reference(self):
        """
        Gera uma referência combinada, baseada nos vínculos diretos e nos itens da invoice.
        Formato: tokens separados por " | ", por exemplo:
        "REQ:REQ-123 | FAR:2 | EXA:3 | CON:1"
        """
        tokens = []

        # Vínculos explícitos
        if self.request_id:
            tokens.append(f"REQ:{getattr(self.request, 'custom_id', None) or self.request_id}")
        if self.sale_id:
            tokens.append(f"SALE:{getattr(self.sale, 'number', None) or self.sale_id}")
        if self.procedure_id:
            tokens.append(f"PROC:{getattr(self.procedure, 'custom_id', None) or self.procedure_id}")
        if self.pk and self.procedures.exists():
            tokens.append(f"PROCS:{self.procedures.count()}")
        if self.consultation_id:
            tokens.append(f"CON:{getattr(self.consultation, 'custom_id', None) or self.consultation_id}")
        if self.pk and hasattr(self, "consultations") and self.consultations.exists():
            tokens.append(f"CONS:{self.consultations.count()}")
        if self.surgery_id:
            tokens.append(f"SURG:{getattr(self.surgery, 'custom_id', None) or self.surgery_id}")

        # Itens: contar por tipo
        try:
            item_qs = self.items.filter(deleted=False)
            if item_qs.exists():
                type_map = {
                    "EXA": "EXA",
                    "EXM": "MED",
                    "CON": "CON",
                    "FAR": "FAR",
                    "PRC": "ENF",
                    "MAT": "MAT",
                    "AJU": "AJU",
                }
                counts = {}
                for item in item_qs.only("item_type"):
                    prefix = type_map.get(item.item_type, item.item_type)
                    counts[prefix] = counts.get(prefix, 0) + 1
                tokens.extend([f"{k}:{v}" for k, v in counts.items()])
        except Exception:
            pass

        if not tokens:
            return None
        return " | ".join(tokens)

    def _validate_source(self):
        """
        Validação mínima: alinha paciente se possível e garante tenant consistente,
        sem impor contagem ou exclusividade de referências.
        """
        refs = []
        if self.request_id:
            refs.append(self.request)
        if self.sale_id:
            refs.append(self.sale)
        if self.consultation_id:
            refs.append(self.consultation)
        if self.surgery_id:
            refs.append(self.surgery)
        if self.procedure_id:
            refs.append(self.procedure)
        if self.pk and self.procedures.exists():
            refs.extend(list(self.procedures.select_related("patient").all()))

        # Alinhar paciente se ainda não definido
        for ref in refs:
            patient_ref = getattr(ref, "patient", None)
            if patient_ref:
                self.patient = self.patient or patient_ref
                break

        # Tenant consistency
        if self.patient_id and self.tenant_id:
            patient_tenant = getattr(self.patient, "tenant_id", None)
            if patient_tenant not in (None, self.tenant_id):
                raise ValidationError({"patient": "Paciente e fatura devem pertencer ao mesmo tenant."})

    def sync_items_from_origin(self):
        if self.status != self.Status.DRAFT:
            raise ValidationError("Only draft invoices can sync items.")

        if self.origin == self.Origin.MIXED:
            # Mixed invoices do not auto-sync items.
            self.persist_totals()
            return

        from apps.billing.models.invoice_items import InvoiceItem

        for item in self.items.filter(deleted=False):
            item.delete()

        if self.origin == self.Origin.CLINICAL:
            if not self.request_id:
                self.persist_totals()
                return

            request_items = self.request.items.select_related(
                "exam",
                "medical_exam",
            )
            for item in request_items:
                if item.exam_id:
                    InvoiceItem.objects.create(
                        tenant=self.tenant,
                        invoice=self,
                        item_type=InvoiceItem.TipoItem.EXAME,
                        exam=item.exam,
                    )

                elif item.medical_exam_id:
                    InvoiceItem.objects.create(
                        tenant=self.tenant,
                        invoice=self,
                        item_type=InvoiceItem.TipoItem.EXAME_MEDICO,
                        medical_exam=item.medical_exam,
                    )

        elif self.origin == self.Origin.PHARMACY:
            if not self.sale_id:
                self.persist_totals()
                return

            sale_items = self.sale.itens.select_related("product")
            for item in sale_items:
                InvoiceItem.objects.create(
                    tenant=self.tenant,
                    invoice=self,
                    item_type=InvoiceItem.TipoItem.ITEM_VENDA,
                    sale_item=item,
                )

        elif self.origin == self.Origin.NURSING:
            procedures = []
            if self.procedure_id:
                procedures = [self.procedure]
            elif self.pk:
                procedures = list(self.procedures.all())

            if not procedures:
                self.persist_totals()
                return

            for proc in procedures:
                # Regra solicitada: incluir apenas itens usados (executados/concluídos)
                # e que tenham valor/preço efetivo.
                procedure_items = proc.itens.filter(deleted=False).select_related("value")
                for item in procedure_items:
                    used_statuses = {
                        item.ExecutionStatus.EXECUTED,
                        item.ExecutionStatus.COMPLETED,
                    }
                    if item.execution_status not in used_statuses:
                        continue

                    if (item.total_linha or Decimal("0.00")) <= Decimal("0.00"):
                        continue

                    InvoiceItem.objects.create(
                        tenant=self.tenant,
                        invoice=self,
                        item_type=InvoiceItem.TipoItem.PROCEDIMENTO_ITEM,
                        procedure_item=item,
                    )

                    if not item.billed:
                        item.mark_billed()

                # Regra solicitada: incluir apenas materiais com custo/valor efetivo.
                materiais_procedure = proc.materiais.filter(deleted=False).select_related("value", "procedure_item")
                for material in materiais_procedure:
                    if material.procedure_item_id:
                        material_item = material.procedure_item
                        material_used_statuses = {
                            material_item.ExecutionStatus.EXECUTED,
                            material_item.ExecutionStatus.COMPLETED,
                        }
                        if material_item.execution_status not in material_used_statuses:
                            continue

                    if (material.total_linha or Decimal("0.00")) <= Decimal("0.00"):
                        continue

                    InvoiceItem.objects.create(
                        tenant=self.tenant,
                        invoice=self,
                        item_type=InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL,
                        procedure_material=material,
                    )

        elif self.origin == self.Origin.CONSULTATION:
            if not self.consultation_id:
                self.persist_totals()
                return

            description = f"Consulta: {getattr(self.consultation, 'type', '')}".strip()
            if not description:
                description = "Consulta"
            vat_percentage = getattr(getattr(self.consultation, "specialty", None), "vat_percentage", None)
            InvoiceItem.objects.create(
                tenant=self.tenant,
                invoice=self,
                item_type=InvoiceItem.TipoItem.AJUSTE,
                description=description,
                quantity=Decimal("1.00"),
                unit_price=getattr(self.consultation, "price", Decimal("0.00")) or Decimal("0.00"),
                vat_percentage=vat_percentage if vat_percentage is not None else Decimal("0.00"),
            )
        elif self.origin == self.Origin.SURGERY:
            if not self.surgery_id:
                self.persist_totals()
                return

            surgical_billing_items = self.surgery.billing_items.filter(
                deleted=False,
                billable=True,
            ).exclude(status="CANCELLED")

            if surgical_billing_items.exists():
                for surgical_item in surgical_billing_items:
                    InvoiceItem.objects.create(
                        tenant=self.tenant,
                        invoice=self,
                        item_type=InvoiceItem.TipoItem.AJUSTE,
                        description=surgical_item.description,
                        quantity=surgical_item.quantity,
                        unit_price=surgical_item.unit_price,
                        vat_percentage=surgical_item.vat_percentage,
                        applies_vat=surgical_item.applies_vat,
                    )
                    surgical_item.invoice = self
                    surgical_item.status = surgical_item.Status.INVOICED
                    surgical_item.billed_at = surgical_item.billed_at or timezone.now()
                    surgical_item.save(update_fields=["invoice", "status", "billed_at"])
            else:
                description = "Cirurgia"
                nomes = []
                with suppress(Exception):
                    nomes = list(self.surgery.procedures.values_list("name", flat=True))
                if nomes:
                    description = f"Cirurgia: {', '.join(nomes[:3])}" + ("..." if len(nomes) > 3 else "")
                elif getattr(self.surgery, "procedure", "").strip():
                    description = f"Cirurgia: {self.surgery.procedure.strip()}"

                price = getattr(self.surgery, "estimated_price", Decimal("0.00")) or Decimal("0.00")
                vat_percentage = getattr(self.surgery, "vat_percentage", None)
                applies_vat = getattr(self.surgery, "applies_vat_by_default", True)

                if price > Decimal("0.00"):
                    InvoiceItem.objects.create(
                        tenant=self.tenant,
                        invoice=self,
                        item_type=InvoiceItem.TipoItem.AJUSTE,
                        description=description,
                        quantity=Decimal("1.00"),
                        unit_price=price,
                        vat_percentage=vat_percentage if vat_percentage is not None else Decimal("0.00"),
                        applies_vat=applies_vat,
                    )

                for procedure_item in self.surgery.procedure_items.filter(deleted=False).exclude(status="CANCELLED"):
                    if (procedure_item.line_total or Decimal("0.00")) <= Decimal("0.00"):
                        continue
                    InvoiceItem.objects.create(
                        tenant=self.tenant,
                        invoice=self,
                        item_type=InvoiceItem.TipoItem.AJUSTE,
                        description=procedure_item.description,
                        quantity=procedure_item.quantity,
                        unit_price=procedure_item.unit_price,
                        vat_percentage=procedure_item.vat_percentage,
                        applies_vat=procedure_item.applies_vat,
                    )

                consumptions = self.surgery.consumptions.filter(
                    deleted=False,
                    billing_status__in=["BILLABLE", "PENDING"],
                ).exclude(material_status__in=["RETURNED", "DISCARDED"])
                for consumption in consumptions:
                    if (consumption.line_total or Decimal("0.00")) <= Decimal("0.00"):
                        continue
                    material = getattr(consumption, "material", None)
                    product = getattr(consumption, "product", None)
                    item_description = getattr(material, "name", "") or getattr(product, "name", "") or "Consumo cirúrgico"
                    InvoiceItem.objects.create(
                        tenant=self.tenant,
                        invoice=self,
                        item_type=InvoiceItem.TipoItem.AJUSTE,
                        description=item_description,
                        quantity=consumption.quantity,
                        unit_price=consumption.charged_price,
                        vat_percentage=Decimal("16.00"),
                        applies_vat=True,
                    )
                    consumption.billing_status = consumption.BillingStatus.BILLED
                    consumption.save(update_fields=["billing_status"])

        self.persist_totals()
        try:
            linhas = [
                f"Origem: {self.get_origin_display()}",
                f"Paciente: {getattr(self.patient, 'name', '-')}",
                f"Items: {self.items.filter(deleted=False).count()}",
                f"Total sem IVA: {self.subtotal:.2f}",
                f"IVA: {self.vat_amount:.2f}",
                f"Total com IVA: {self.total:.2f}",
            ]
            self.register_history("SINCRONIZACAO", "Items synchronized", linhas=linhas)
        except Exception:
            pass

    # ==========================================
    # EMISSÃO
    # ==========================================

    @transaction.atomic
    def issue(self):
        if self.status != self.Status.DRAFT:
            raise ValidationError("Only draft invoices can be issued.")

        if not self.items.filter(deleted=False).exists():
            raise ValidationError("Invoice has no items.")

        has_nursing_items = self.items.filter(
            deleted=False,
            item_type__in=[
                "PRC",
                "MAT",
            ],
        ).exists()

        if self.origin == self.Origin.NURSING or has_nursing_items:
            from apps.pharmacy.models.lot import Lot

            billed_material_ids = list(
                self.items.filter(
                    deleted=False,
                    item_type="MAT",
                    procedure_material__isnull=False,
                ).values_list("procedure_material_id", flat=True)
            )

            pendentes = []
            if billed_material_ids:
                from apps.nursing.models.procedure_material import ProcedureMaterial

                pendentes = list(
                    ProcedureMaterial.objects.filter(
                        pk__in=billed_material_ids,
                        inventory_movement__isnull=True,
                        deleted=False,
                    )
                    .select_related("product")
                    .all()
                )

            faltas = []
            for material in pendentes:
                # Regra atual: cada consumo precisa caber em um lot válido.
                lotes = Lot.available(material.product)
                if self.tenant_id:
                    lotes = lotes.filter(tenant_id=self.tenant_id)

                best = lotes.order_by("-saldo").first()
                disponivel = int(getattr(best, "saldo", 0) or 0) if best else 0
                necessario = int(material.quantity or 0)

                if disponivel < necessario:
                    faltas.append(
                        f"{material.product.name} (product_id={material.product_id}): "
                        f"necessario {necessario}, disponivel {disponivel}"
                    )

            if faltas:
                raise ValidationError(
                    {
                        "estoque": (
                            "Estoque insuficiente na farmácia para emitir a fatura. "
                            "Atualize o estoque e tente novamente."
                        ),
                        "items": faltas,
                    }
                )

            # Baixa/lança o estoque pendente antes de emitir.
            for material in pendentes:
                material.save(alocar_estoque=True)

            billed_procedure_ids = list(
                self.items.filter(
                    deleted=False,
                    item_type="PRC",
                    procedure_item__isnull=False,
                ).values_list("procedure_item_id", flat=True)
            )
            if billed_procedure_ids:
                from apps.nursing.models.procedure_item import ProcedureItem

                for procedure_item in ProcedureItem.objects.filter(
                    pk__in=billed_procedure_ids,
                    deleted=False,
                ):
                    procedure_item.mark_billed()

        self.persist_totals()
        self.status = self.Status.ISSUED
        self.save(update_fields=["status", "subtotal", "vat_amount", "total", "patient_amount"])
        try:
            linhas = [
                f"Origem: {self.get_origin_display()}",
                f"Paciente: {getattr(self.patient, 'name', '-')}",
                f"Total sem IVA: {self.subtotal:.2f}",
                f"IVA: {self.vat_amount:.2f}",
                f"Total com IVA: {self.total:.2f}",
            ]
            self.register_history("EMISSAO", "Fatura emitida", linhas=linhas)
        except Exception:
            pass

    # ==========================================
    # BLOQUEIO DE ALTERAÇÃO
    # ==========================================

    def clean(self):
        super().clean()

        self._validate_source()

        if self.pk:
            original = Invoice.all_objects.get(pk=self.pk)
            if original.status != self.Status.DRAFT:
                raise ValidationError("Fatura já emitida não pode ser alterada.")

    def save(self, *args, **kwargs):
        # Congela os dados fiscais do cliente (entidade) na fatura.
        if self.fiscal_client_id and not (self.fiscal_client_name or "").strip():
            company = self.fiscal_client
            self.fiscal_client_name = getattr(company, "name", "") or ""
            self.fiscal_client_nuit = getattr(company, "nuit", "") or ""
            self.fiscal_client_address = getattr(company, "headquarters_address", "") or ""
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = list(
                    set(update_fields) | {"fiscal_client_name", "fiscal_client_nuit", "fiscal_client_address"}
                )
        return super().save(*args, **kwargs)

    def fiscal_client_details(self) -> dict:
        """Resolve o cliente fiscal (quem paga). Por omissão, o paciente."""
        name = (self.fiscal_client_name or "").strip()
        nuit = (self.fiscal_client_nuit or "").strip()
        address = (self.fiscal_client_address or "").strip()

        if not name and self.fiscal_client_id:
            company = self.fiscal_client
            name = (getattr(company, "name", "") or "").strip()
            nuit = (getattr(company, "nuit", "") or "").strip()
            address = (getattr(company, "headquarters_address", "") or "").strip()

        if name:
            return {"kind": "entity", "name": name, "nuit": nuit, "address": address}

        patient = self.patient if self.patient_id else None
        if patient:
            parts = [
                getattr(patient, "address_street", ""),
                getattr(patient, "address_neighborhood", ""),
                getattr(patient, "address_city", ""),
                getattr(patient, "address_province", ""),
            ]
            patient_address = ", ".join(str(p) for p in parts if p)
            doc = f"{getattr(patient, 'document_type', '') or ''} {getattr(patient, 'document_number', '') or ''}".strip()
            return {
                "kind": "patient",
                "name": getattr(patient, "name", "") or "",
                "nuit": doc,
                "address": patient_address,
            }
        return {"kind": "none", "name": "—", "nuit": "", "address": ""}

    def __str__(self):
        if self.patient_id:
            return f"{self.custom_id} - {self.patient.name}"
        return f"{self.custom_id}"
