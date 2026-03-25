from contextlib import suppress
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Case, DecimalField, F, Sum, Value, When
from django.db.models.functions import Coalesce

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from core.models.base import NoNameCoreModel


class Invoice(NoNameCoreModel):
    prefix = "FAT"

    class Status(models.TextChoices):
        DRAFT = "RASC", "Rascunho"
        ISSUED = "EMIT", "Emitida"
        PAID = "PAGA", "Paga"
        CANCELED = "CANC", "Cancelada"

    class Origin(models.TextChoices):
        CLINICAL = "CLI", "Clínico"
        PHARMACY = "FAR", "Farmácia"
        NURSING = "ENF", "Enfermagem"
        CONSULTATION = "CON", "Consulta"
        SURGERY = "CIR", "Cirurgia"
        MIXED = "MIX", "Mista"

    origin = models.CharField(

        db_column="origin",

        verbose_name="Origem",
        max_length=3,
        choices=Origin.choices,
        default=Origin.CLINICAL,
        db_index=True,
    )

    request = models.OneToOneField(

        LabRequest,

        db_column="request_id",
        verbose_name="Requisição",
        on_delete=models.CASCADE,
        related_name="invoice",
        null=True,
        blank=True,
    )
    sale = models.OneToOneField(
        "farmacia.Sale",
        db_column="sale_id",
        verbose_name="Venda",
        on_delete=models.PROTECT,
        related_name="invoice",
        null=True,
        blank=True,
    )
    procedure = models.OneToOneField(
        "enfermagem.Procedure",
        db_column="procedure_id",
        verbose_name="Procedimento (legado)",
        on_delete=models.PROTECT,
        related_name="invoice",
        null=True,
        blank=True,
        help_text="Legado: prefira usar o campo 'procedures' (múltiplos).",
    )
    procedures = models.ManyToManyField(
        "enfermagem.Procedure",
        db_table="faturamento_fatura_procedimentos",
        verbose_name="Procedimentos (Enfermagem)",
        blank=True,
        related_name="faturas",
        help_text="Pode associar múltiplos procedures de enfermagem à mesma invoice.",
    )
    consultation = models.OneToOneField(
        "consultas.MedicalConsultation",
        db_column="consultation_id",
        verbose_name="Consulta",
        on_delete=models.PROTECT,
        related_name="invoice",
        null=True,
        blank=True,
    )
    surgery = models.OneToOneField(
        "cirurgia.Surgery",
        db_column="surgery_id",
        verbose_name="Cirurgia",
        on_delete=models.PROTECT,
        related_name="invoice",
        null=True,
        blank=True,
    )

    patient = models.ForeignKey(

        Patient,

        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="faturas",
        null=True,
        blank=True,
    )

    subtotal = models.DecimalField(verbose_name="Total sem IVA", max_digits=12, decimal_places=2, default=0)
    vat_amount = models.DecimalField(
        db_column="vat_amount",
        verbose_name="Total de IVA", max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(verbose_name="Total com IVA", max_digits=12, decimal_places=2, default=0)

    insurance_amount = models.DecimalField(

        db_column="insurance_amount",

        verbose_name="Valor do seguro", max_digits=12, decimal_places=2, default=0)
    patient_amount = models.DecimalField(
        db_column="patient_amount",
        verbose_name="Valor do patient", max_digits=12, decimal_places=2, default=0)

    status = models.CharField(

        db_column="status",

        verbose_name="Estado",
        max_length=5,
        choices=Status.choices,
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
        linha_expr = F("quantity") * F("unit_price")
        subtotal = self.itens.aggregate(
            total=Coalesce(
                Sum(
                    linha_expr,
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

        iva_expr = Case(
            When(
                applies_vat=True,
                then=linha_expr * Coalesce(F("vat_percentage"), Value(Decimal("0.00"))) / Value(Decimal("100.00")),
            ),
            default=Value(Decimal("0.00")),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )

        iva = self.itens.aggregate(
            total=Coalesce(
                Sum(iva_expr, output_field=DecimalField(max_digits=12, decimal_places=2)),
                Decimal("0.00"),
            )
        )["total"]

        total = (subtotal or Decimal("0.00")) + (iva or Decimal("0.00"))

        self.subtotal = subtotal
        self.vat_amount = iva
        self.total = total
        insurance_amount = self.insurance_amount or Decimal("0.00")
        if insurance_amount > total:
            insurance_amount = total
        self.insurance_amount = insurance_amount
        self.patient_amount = max(total - insurance_amount, Decimal("0.00"))

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

    def confirmed_paid_amount(self):
        from apps.payments.models.payment import Payment

        return self.pagamentos.filter(
            status=Payment.Status.CONFIRMED,
            deleted=False,
        ).aggregate(
            total=Coalesce(
                Sum(
                    "value",
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                ),
                Decimal("0.00"),
            )
        )["total"]

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
            if recibo.value != self.total:
                # O recibo representa o payment total da invoice (não só o
                # último payment).
                recibo.value = self.total
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
            value=self.total,
        )

    def update_payment_status(self, payment=None):
        if self.status in {self.Status.DRAFT, self.Status.CANCELED}:
            return

        total_paid = self.confirmed_paid_amount() or Decimal("0.00")
        total_invoice = self.total or Decimal("0.00")
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
        if self.origin == self.Origin.CLINICAL:
            return self.request
        if self.origin == self.Origin.PHARMACY:
            return self.sale
        if self.origin == self.Origin.NURSING:
            if self.pk and self.procedures.exists():
                return f"{self.procedures.count()} procedure(s)"
            return self.procedure
        if self.origin == self.Origin.CONSULTATION:
            return self.consultation
        if self.origin == self.Origin.SURGERY:
            return self.surgery
        if self.origin == self.Origin.MIXED:
            return None
        return None

    def _validate_source(self):
        if self.origin == self.Origin.MIXED:
            refs = []
            if self.request_id:
                refs.append(self.request)
            if self.sale_id and getattr(self.sale, "patient_id", None):
                refs.append(self.sale)
            if self.procedure_id:
                refs.append(self.procedure)
            if self.consultation_id:
                refs.append(self.consultation)
            if self.surgery_id:
                refs.append(self.surgery)
            if self.pk and self.procedures.exists():
                refs.extend(list(self.procedures.select_related("patient").all()))

            if refs:
                primeiro = refs[0]
                patient_ref = getattr(primeiro, "patient", None)
                patient_id = getattr(patient_ref, "id", None)
                tenant_id = getattr(primeiro, "tenant_id", None)

                for ref in refs[1:]:
                    ref_patient_id = getattr(getattr(ref, "patient", None), "id", None)
                    if patient_id and ref_patient_id and ref_patient_id != patient_id:
                        raise ValidationError({"patient": "Referências da invoice mista devem ser do mesmo patient."})
                    ref_tenant_id = getattr(ref, "tenant_id", None)
                    if tenant_id and ref_tenant_id and ref_tenant_id != tenant_id:
                        raise ValidationError({"tenant": "Referências da invoice mista devem ser do mesmo tenant."})

                if not self.patient_id and patient_ref is not None:
                    self.patient = patient_ref

            if self.patient_id and self.patient.tenant_id != self.tenant_id:
                raise ValidationError({"patient": "Paciente e invoice devem pertencer ao mesmo tenant."})
            return

        if self.origin == self.Origin.NURSING:
            # Enfermagem: pode usar legado (procedure) OU múltiplos (procedures).
            if self.procedure_id and self.pk and self.procedures.exists():
                raise ValidationError(
                    {"procedures": ("Use um: 'procedure (legado)' OU 'procedures (múltiplos)'.")}
                )

            if self.request_id:
                raise ValidationError({"request": "Remova a requisição, não corresponde à origin Enfermagem."})
            if self.sale_id:
                raise ValidationError({"sale": "Remova a sale, não corresponde à origin Enfermagem."})
            if self.consultation_id:
                raise ValidationError({"consultation": "Remova a consultation, não corresponde à origin Enfermagem."})

            if self.procedure_id:
                self.patient = self.procedure.patient
                if self.tenant_id and self.procedure.tenant_id != self.tenant_id:
                    raise ValidationError({"procedure": "Procedimento e invoice devem pertencer ao mesmo tenant."})
            elif self.pk:
                procs = list(self.procedures.select_related("patient").all())
                if not procs:
                    raise ValidationError({"procedures": "Informe ao menos um procedure."})
                patient_id = procs[0].patient_id
                tenant_id = procs[0].tenant_id
                for p in procs:
                    if p.tenant_id != tenant_id:
                        raise ValidationError(
                            {"procedures": "Todos os procedures devem pertencer ao mesmo tenant."}
                        )
                    if p.patient_id != patient_id:
                        raise ValidationError({"procedures": "Todos os procedures devem ser do mesmo patient."})
                if self.tenant_id and tenant_id != self.tenant_id:
                    raise ValidationError(
                        {"procedures": "Procedimentos e invoice devem pertencer ao mesmo tenant."}
                    )
                self.patient = procs[0].patient

        else:
            # Demais origens (mantém regra: exatamente uma referência)
            campos_origin = {
                self.Origin.CLINICAL: "request",
                self.Origin.PHARMACY: "sale",
                self.Origin.NURSING: "procedure",
                self.Origin.CONSULTATION: "consultation",
                self.Origin.SURGERY: "surgery",
            }
            campo_esperado = campos_origin[self.origin]

            vinculados = {
                "request": bool(self.request_id),
                "sale": bool(self.sale_id),
                "procedure": bool(self.procedure_id),
                "consultation": bool(self.consultation_id),
                "surgery": bool(self.surgery_id),
            }
            if sum(vinculados.values()) != 1:
                raise ValidationError("A invoice deve possuir exatamente uma referência de origin.")

            if not vinculados[campo_esperado]:
                raise ValidationError({campo_esperado: "Informe a referência compatível com a origin."})

            for campo, informado in vinculados.items():
                if campo != campo_esperado and informado:
                    raise ValidationError({campo: "Remova esta referência, ela não corresponde à origin."})

            if self.pk and self.procedures.exists():
                raise ValidationError(
                    {"procedures": "Remova os procedures, não correspondem à origin selecionada."}
                )

            if self.origin == self.Origin.CLINICAL and self.request_id:
                self.patient = self.request.patient
                if self.request.tenant_id != self.tenant_id:
                    raise ValidationError({"request": "Requisição e invoice devem pertencer ao mesmo tenant."})

        if self.origin == self.Origin.PHARMACY and self.sale_id:
            if getattr(self.sale, "patient_id", None):
                self.patient = self.sale.patient
            if self.sale.tenant_id != self.tenant_id:
                raise ValidationError({"sale": "Venda e invoice devem pertencer ao mesmo tenant."})

        if self.origin == self.Origin.CONSULTATION and self.consultation_id:
            self.patient = self.consultation.patient
            if self.consultation.tenant_id != self.tenant_id:
                raise ValidationError({"consultation": "Consulta e invoice devem pertencer ao mesmo tenant."})

        if self.origin == self.Origin.SURGERY and self.surgery_id:
            self.patient = self.surgery.patient
            if self.surgery.tenant_id != self.tenant_id:
                raise ValidationError({"surgery": "Cirurgia e invoice devem pertencer ao mesmo tenant."})

        if self.patient_id and self.patient.tenant_id != self.tenant_id:
            raise ValidationError({"patient": "Paciente e invoice devem pertencer ao mesmo tenant."})

    def sync_items_from_origin(self):
        if self.status != self.Status.DRAFT:
            raise ValidationError("Somente faturas em rascunho podem sincronizar itens.")

        if self.origin == self.Origin.MIXED:
            # Fatura mista não sincroniza itens automaticamente.
            self.persist_totals()
            return

        from apps.billing.models.invoice_items import InvoiceItem

        for item in self.itens.filter(deleted=False):
            item.delete()

        if self.origin == self.Origin.CLINICAL:
            itens_request = self.request.itens.select_related(
                "exam",
                "medical_exam",
            )
            for item in itens_request:
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
            itens_sale = self.sale.itens.select_related("product")
            for item in itens_sale:
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
                raise ValidationError(
                    {"procedures": "Informe ao menos um procedure de enfermagem para sincronizar itens."}
                )

            for proc in procedures:
                itens_procedure = proc.itens.filter(performed=True)
                for item in itens_procedure:
                    InvoiceItem.objects.create(
                        tenant=self.tenant,
                        invoice=self,
                        item_type=InvoiceItem.TipoItem.PROCEDIMENTO_ITEM,
                        procedure_item=item,
                    )

                materiais_procedure = proc.materiais.all()
                for material in materiais_procedure:
                    InvoiceItem.objects.create(
                        tenant=self.tenant,
                        invoice=self,
                        item_type=InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL,
                        procedure_material=material,
                    )

        elif self.origin == self.Origin.CONSULTATION:
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

        self.persist_totals()
        try:
            linhas = [
                f"Origem: {self.get_origin_display()}",
                f"Paciente: {getattr(self.patient, 'name', '-')}",
                f"Itens: {self.itens.filter(deleted=False).count()}",
                f"Total sem IVA: {self.subtotal:.2f}",
                f"IVA: {self.vat_amount:.2f}",
                f"Total com IVA: {self.total:.2f}",
            ]
            self.register_history("SINCRONIZACAO", "Itens sincronizados", linhas=linhas)
        except Exception:
            pass

    # ==========================================
    # EMISSÃO
    # ==========================================

    @transaction.atomic
    def issue(self):
        if self.status != self.Status.DRAFT:
            raise ValidationError("Somente faturas em rascunho podem ser emitidas.")

        if not self.itens.filter(deleted=False).exists():
            raise ValidationError("Fatura sem itens.")

        if self.origin == self.Origin.NURSING:
            from apps.pharmacy.models.lot import Lot

            procedures = []
            if self.procedure_id:
                procedures = [self.procedure]
            elif self.pk:
                procedures = list(self.procedures.all())

            pendentes = []
            for proc in procedures:
                pendentes.extend(
                    list(proc.materiais.filter(inventory_movement__isnull=True).select_related("product").all())
                )

            faltas = []
            for material in pendentes:
                # Regra atual: cada consumo precisa caber em um lot válido.
                lotes = Lot.disponiveis(material.product)
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
                            "Estoque insuficiente na farmácia para emitir a invoice. "
                            "Atualize o estoque e tente novamente."
                        ),
                        "itens": faltas,
                    }
                )

            # Baixa/lança o estoque pendente antes de emitir.
            for material in pendentes:
                material.save(alocar_estoque=True)

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

    def __str__(self):
        if self.patient_id:
            return f"{self.custom_id} - {self.patient.name}"
        return f"{self.custom_id}"
