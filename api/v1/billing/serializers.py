from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin
from apps.billing.models.credit_note_request import CreditNoteRequest
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_history import InvoiceHistory
from apps.billing.models.invoice_items import InvoiceItem

CORE_READ_ONLY_FIELDS = [
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
]

INVOICE_LEGACY_ALIASES = {
    "cirurgia": "surgery",
    "consulta": "consultation",
    "consulta_medica": "consultation",
    "consultas": "consultations",
    "criado_em": "created_at",
    "criado_por_departamento": "created_by_department",
    "criado_por_nome": "created_by_name",
    "desconto_seguro": "insurance_amount",
    "estado": "status",
    "estado_fatura": "status",
    "estado_factura": "status",
    "id_custom": "custom_id",
    "iva": "vat_amount",
    "iva_valor": "vat_amount",
    "origem": "origin",
    "origem_fatura": "origin",
    "origem_factura": "origin",
    "paciente": "patient",
    "procedimento": "procedure",
    "procedimentos": "procedures",
    "requisicao": "request",
    "requisição": "request",
    "seguro": "insurance_amount",
    "setores_itens_faturados": "billed_item_sectors",
    "subtotal_sem_iva": "subtotal",
    "total_sem_iva": "subtotal",
    "total_com_iva": "total",
    "valor_total": "total",
    "valor_a_pagar": "total_a_pagar",
    "valor_paciente": "patient_amount",
    "valor_seguro": "insurance_amount",
    "venda": "sale",
}

INVOICE_ITEM_LEGACY_ALIASES = {
    "aplica_iva": "applies_vat",
    "aplicar_iva": "applies_vat",
    "criado_em": "created_at",
    "descricao": "description",
    "descrição": "description",
    "exame": "exam",
    "exame_medico": "medical_exam",
    "fatura": "invoice",
    "factura": "invoice",
    "id_custom": "custom_id",
    "item_venda": "sale_item",
    "iva": "vat_percentage",
    "iva_percentagem": "vat_percentage",
    "iva_percentual": "vat_percentage",
    "iva_valor": "vat_amount",
    "material_procedimento": "procedure_material",
    "percentagem_iva": "vat_percentage",
    "posicao": "position",
    "preco": "unit_price",
    "preço": "unit_price",
    "preco_unitario": "unit_price",
    "preço_unitário": "unit_price",
    "procedimento_item": "procedure_item",
    "procedimento_material": "procedure_material",
    "produto": "product",
    "quantidade": "quantity",
    "setor_item_faturado": "billed_sector",
    "taxa_iva": "vat_percentage",
    "tipo": "item_type",
    "tipo_de_item": "item_type",
    "tipo_item": "item_type",
    "tipo_item_fatura": "item_type",
    "tipo_item_factura": "item_type",
    "valor": "unit_price",
    "valor_unitario": "unit_price",
    "valor_unitário": "unit_price",
}

INVOICE_HISTORY_LEGACY_ALIASES = {
    "criado_em": "created_at",
    "descricao": "description",
    "descrição": "description",
    "evento": "event_type",
    "fatura": "invoice",
    "factura": "invoice",
    "id_custom": "custom_id",
    "nome": "name",
    "observacao": "description",
    "observação": "description",
    "titulo": "name",
    "título": "name",
    "tipo": "event_type",
    "tipo_evento": "event_type",
}


class InvoiceSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INVOICE_LEGACY_ALIASES
    legacy_output_aliases = INVOICE_LEGACY_ALIASES
    created_by_name = serializers.SerializerMethodField(method_name="get_created_by_name")
    created_by_department = serializers.SerializerMethodField(method_name="get_created_by_department")
    billed_item_sectors = serializers.SerializerMethodField(method_name="get_billed_item_sectors")
    total_a_pagar = serializers.SerializerMethodField(method_name="get_total_a_pagar")
    has_pending_credit_note_request = serializers.SerializerMethodField()

    @staticmethod
    def _user_display(user):
        if not user:
            return ""

        full_name = (getattr(user, "get_full_name", lambda: "")() or "").strip()
        if full_name:
            return full_name

        return getattr(user, "username", "") or ""

    @staticmethod
    def _format_money(value):
        try:
            return str(Decimal(value).quantize(Decimal("0.01")))
        except Exception:
            return None

    def get_created_by_name(self, obj):
        return self._user_display(getattr(obj, "created_by", None))

    def get_created_by_department(self, obj):
        user = getattr(obj, "created_by", None)
        profile = getattr(user, "perfil_professional", None) if user else None
        return (getattr(profile, "department", "") or "").strip()

    def get_billed_item_sectors(self, obj):
        prefetched = getattr(obj, "_prefetched_objects_cache", {}).get("items")
        if prefetched is not None:
            items = [item for item in prefetched if not getattr(item, "deleted", False)]
        else:
            items = obj.items.filter(deleted=False)

        sectors = {
            (getattr(item, "billed_sector", "") or "").strip()
            for item in items
        }
        return sorted([sector for sector in sectors if sector])

    def get_total_a_pagar(self, obj):
        return self._format_money(getattr(obj, "total_a_pagar", None))

    def get_has_pending_credit_note_request(self, obj: Invoice) -> bool:
        return CreditNoteRequest.objects.filter(
            invoice=obj,
            status=CreditNoteRequest.Status.PENDING,
            deleted=False,
        ).exists()

    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = [*CORE_READ_ONLY_FIELDS, "has_pending_credit_note_request"]


class InvoiceItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INVOICE_ITEM_LEGACY_ALIASES
    legacy_output_aliases = INVOICE_ITEM_LEGACY_ALIASES

    @staticmethod
    def _format_money(value):
        try:
            return str(Decimal(value).quantize(Decimal("0.01")))
        except Exception:
            return None

    def _remove_existing_items(self, *, invoice, item_type, reference):
        if not invoice or not reference:
            return

        reference_field = {
            InvoiceItem.TipoItem.EXAME: "exam",
            InvoiceItem.TipoItem.EXAME_MEDICO: "medical_exam",
            InvoiceItem.TipoItem.ITEM_VENDA: "sale_item",
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: "procedure_item",
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: "procedure_material",
        }.get(item_type)

        if not reference_field:
            return

        queryset = InvoiceItem.objects.filter(
            invoice=invoice,
            deleted=False,
            **{reference_field: reference},
        )

        if getattr(self, "instance", None) is not None:
            queryset = queryset.exclude(pk=self.instance.pk)

        for item in queryset:
            item.delete()

    def create(self, validated_date):
        invoice = validated_date.get("invoice")
        item_type = validated_date.get("item_type", InvoiceItem.TipoItem.EXAME)
        reference = {
            InvoiceItem.TipoItem.EXAME: validated_date.get("exam"),
            InvoiceItem.TipoItem.EXAME_MEDICO: validated_date.get("medical_exam"),
            InvoiceItem.TipoItem.ITEM_VENDA: validated_date.get("sale_item"),
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: validated_date.get("procedure_item"),
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: validated_date.get("procedure_material"),
        }.get(item_type)

        with transaction.atomic():
            self._remove_existing_items(
                invoice=invoice,
                item_type=item_type,
                reference=reference,
            )

            return super().create(validated_date)

    def update(self, instance, validated_date):
        item_type = validated_date.get("item_type", instance.item_type)
        reference = {
            InvoiceItem.TipoItem.EXAME: validated_date.get("exam", instance.exam),
            InvoiceItem.TipoItem.EXAME_MEDICO: validated_date.get("medical_exam", instance.medical_exam),
            InvoiceItem.TipoItem.ITEM_VENDA: validated_date.get("sale_item", instance.sale_item),
            InvoiceItem.TipoItem.PROCEDIMENTO_ITEM: validated_date.get(
                "procedure_item", instance.procedure_item
            ),
            InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL: validated_date.get(
                "procedure_material", instance.procedure_material
            ),
        }.get(item_type)

        with transaction.atomic():
            self._remove_existing_items(
                invoice=validated_date.get("invoice", instance.invoice),
                item_type=item_type,
                reference=reference,
            )

            return super().update(instance, validated_date)

    total_sem_iva = serializers.SerializerMethodField(method_name="get_total_before_tax")
    vat_amount = serializers.SerializerMethodField(method_name="get_tax_amount")
    total_com_iva = serializers.SerializerMethodField(method_name="get_total_with_tax")
    billed_sector = serializers.SerializerMethodField(method_name="get_billed_sector")

    def get_total_before_tax(self, obj):
        return self._format_money(getattr(obj, "total_sem_iva", None))

    def get_tax_amount(self, obj):
        return self._format_money(getattr(obj, "vat_amount", None))

    def get_total_with_tax(self, obj):
        return self._format_money(getattr(obj, "total_com_iva", None))

    def get_billed_sector(self, obj):
        return (getattr(obj, "billed_sector", "") or "").strip()

    class Meta:
        model = InvoiceItem
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        validators: list = []  # evita UniqueValidators automáticos que usam campo deleted


class InvoiceHistorySerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INVOICE_HISTORY_LEGACY_ALIASES
    legacy_output_aliases = INVOICE_HISTORY_LEGACY_ALIASES

    class Meta:
        model = InvoiceHistory
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class CreditNoteRequestSerializer(serializers.ModelSerializer):
    invoice_code = serializers.CharField(source="invoice.custom_id", read_only=True)
    invoice_status = serializers.CharField(source="invoice.status", read_only=True)
    consultation_code = serializers.CharField(source="consultation.custom_id", read_only=True, default=None)
    patient_name = serializers.CharField(source="patient.name", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    requested_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True, default=None)
    reviewed_by_name = serializers.CharField(source="reviewed_by.get_full_name", read_only=True, default=None)

    class Meta:
        model = CreditNoteRequest
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + [
            "status",
            "reviewed_by",
            "reviewed_at",
            "decision_note",
        ]


SERIALIZER_MAP = {
    "invoice": InvoiceSerializer,
    "faturaitem": InvoiceItemSerializer,
    "historicofatura": InvoiceHistorySerializer,
    "pedidonotacredito": CreditNoteRequestSerializer,
}
