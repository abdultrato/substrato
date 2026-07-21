from collections.abc import Mapping

from django.db.models import Q
from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin, normalize_legacy_input
from apps.pharmacy.models.inventory_movement import InventoryMovement
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.material_requisition import MaterialRequisition
from apps.pharmacy.models.material_requisition_item import MaterialRequisitionItem
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ParentCategory, ProductCategory
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem

CORE_READ_ONLY_FIELDS = (
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
)

BASE_ALIASES = {
    "id_custom": "custom_id",
    "codigo": "custom_id",
    "código": "custom_id",
    "nome": "name",
    "descricao": "description",
    "descrição": "description",
    "ativo": "active",
    "ativa": "active",
    "activo": "active",
    "activa": "active",
    "ordem": "order",
    "posicao": "position",
    "posição": "position",
}

PRODUCT_ALIASES = {
    **BASE_ALIASES,
    "categoria": "category",
    "category": "category",
    "tipo": "type",
    "type": "type",
    "preco": "sale_price",
    "preço": "sale_price",
    "preco_venda": "sale_price",
    "preço_venda": "sale_price",
    "preco_de_venda": "sale_price",
    "preço_de_venda": "sale_price",
    "sale_price": "sale_price",
    "iva": "vat_percentage",
    "percentagem_iva": "vat_percentage",
    "vat_percentage": "vat_percentage",
    "aplica_iva": "applies_vat_by_default",
    "aplicar_iva": "applies_vat_by_default",
    "aplica_iva_por_padrao": "applies_vat_by_default",
    "aplica_iva_por_padrão": "applies_vat_by_default",
    "applies_vat_by_default": "applies_vat_by_default",
}

LOT_ALIASES = {
    **BASE_ALIASES,
    "produto": "product",
    "product": "product",
    "lote": "lot_number",
    "numero_lote": "lot_number",
    "número_lote": "lot_number",
    "numero_do_lote": "lot_number",
    "número_do_lote": "lot_number",
    "lot_number": "lot_number",
    "validade": "expiration_date",
    "data_validade": "expiration_date",
    "data_de_validade": "expiration_date",
    "expiration_date": "expiration_date",
    "quantidade": "initial_quantity",
    "quantidade_inicial": "initial_quantity",
    "initial_quantity": "initial_quantity",
    "preco": "sale_price",
    "preço": "sale_price",
    "preco_unitario": "sale_price",
    "preço_unitário": "sale_price",
    "preco_venda": "sale_price",
    "preço_venda": "sale_price",
    "sale_price": "sale_price",
    "saldo": "saldo",
    "stock": "saldo",
    "estoque": "saldo",
    "estado": "status",
    "status": "status",
    "motivo_estado": "status_reason",
    "motivo_do_estado": "status_reason",
    "status_reason": "status_reason",
}

INVENTORY_MOVEMENT_ALIASES = {
    **BASE_ALIASES,
    "lote": "lot",
    "lot": "lot",
    "tipo": "type",
    "type": "type",
    "origem": "origin",
    "origin": "origin",
    "item_venda": "sale_item",
    "item_de_venda": "sale_item",
    "sale_item": "sale_item",
    "item_requisicao": "material_request_item",
    "item_requisição": "material_request_item",
    "item_requisicao_material": "material_request_item",
    "item_requisição_material": "material_request_item",
    "material_request_item": "material_request_item",
    "quantidade": "quantity",
    "quantity": "quantity",
}

SALE_ALIASES = {
    **BASE_ALIASES,
    "numero": "number",
    "número": "number",
    "numero_venda": "number",
    "número_venda": "number",
    "number": "number",
    "paciente": "patient",
    "utente": "patient",
    "patient": "patient",
    "fatura": "invoice",
    "factura": "invoice",
    "invoice": "invoice",
    "total": "total",
    "valor": "total",
}

SALE_ITEM_ALIASES = {
    **BASE_ALIASES,
    "venda": "sale",
    "sale": "sale",
    "produto": "product",
    "product": "product",
    "quantidade": "quantity",
    "quantity": "quantity",
    "preco_unitario": "unit_price",
    "preço_unitário": "unit_price",
    "preco": "unit_price",
    "preço": "unit_price",
    "unit_price": "unit_price",
}

MATERIAL_REQUISITION_ITEM_ALIASES = {
    **BASE_ALIASES,
    "requisicao": "requisition",
    "requisição": "requisition",
    "requisicao_material": "requisition",
    "requisição_material": "requisition",
    "pedido_material": "requisition",
    "requisition": "requisition",
    "lote": "lot",
    "lot": "lot",
    "quantidade": "requested_quantity",
    "quantidade_solicitada": "requested_quantity",
    "requested_quantity": "requested_quantity",
    "quantidade_aviada": "supplied_quantity",
    "quantidade_fornecida": "supplied_quantity",
    "supplied_quantity": "supplied_quantity",
    "observacao": "notes",
    "observação": "notes",
    "observacoes": "notes",
    "observações": "notes",
    "notas": "notes",
    "notes": "notes",
}

MATERIAL_REQUISITION_ALIASES = {
    **BASE_ALIASES,
    "setor": "sector",
    "sector": "sector",
    "setor_solicitante": "sector",
    "sector_solicitante": "sector",
    "departamento": "requested_by_department",
    "departamento_solicitante": "requested_by_department",
    "requested_by_department": "requested_by_department",
    "estado": "status",
    "status": "status",
    "motivo_arquivo": "hold_reason",
    "motivo_arquivamento": "hold_reason",
    "hold_reason": "hold_reason",
    "itens": "items_input",
    "items": "items_input",
    "itens_input": "items_input",
    "items_input": "items_input",
}


def _request_tenant(context):
    request = (context or {}).get("request") if isinstance(context, Mapping) else None
    return getattr(request, "tenant", None)


def _resolve_lot_reference(value, *, context):
    if value in ("", None) or isinstance(value, int):
        return value
    raw = str(value).strip()
    if raw.isdigit():
        return int(raw)

    queryset = Lot.objects.filter(deleted=False)
    tenant = _request_tenant(context)
    if tenant is not None:
        queryset = queryset.filter(tenant=tenant)

    lot = (
        queryset.filter(
            Q(custom_id__iexact=raw)
            | Q(lot_number__iexact=raw)
            | Q(name__icontains=raw)
            | Q(product__name__icontains=raw)
        )
        .order_by("-id")
        .first()
    )
    return lot.pk if lot is not None else value


class SaleItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = SALE_ITEM_ALIASES
    legacy_output_aliases = SALE_ITEM_ALIASES

    class Meta:
        model = SaleItem
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "unit_price")
        validators = []
        extra_kwargs = {
            "name": {"required": False, "allow_blank": True},
            "unit_price": {"read_only": True},
        }


class LotSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = LOT_ALIASES
    legacy_output_aliases = LOT_ALIASES

    saldo = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="product.name", read_only=True)

    def get_saldo(self, obj):
        try:
            saldo = getattr(obj, "saldo", None)
            if callable(saldo):
                saldo = saldo()
            if saldo is None:
                saldo = obj.balance()
            return int(saldo or 0)
        except Exception:
            return 0

    class Meta:
        model = Lot
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "saldo", "product_name")
        validators = []
        extra_kwargs = {
            "name": {"required": False, "allow_blank": True},
        }


class InventoryMovementSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INVENTORY_MOVEMENT_ALIASES
    legacy_output_aliases = INVENTORY_MOVEMENT_ALIASES

    class Meta:
        model = InventoryMovement
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "name": {"required": False, "allow_blank": True},
        }


class ProductSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PRODUCT_ALIASES
    legacy_output_aliases = PRODUCT_ALIASES

    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class SaleSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = SALE_ALIASES
    legacy_output_aliases = SALE_ALIASES

    class Meta:
        model = Sale
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "number": {"required": False, "allow_blank": True},
        }


class MaterialRequisitionItemWriteSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = MATERIAL_REQUISITION_ITEM_ALIASES
    legacy_output_aliases = MATERIAL_REQUISITION_ITEM_ALIASES

    def to_internal_value(self, data):
        normalized = normalize_legacy_input(data, self.legacy_input_aliases)
        if isinstance(normalized, Mapping):
            normalized = dict(normalized)
            if "lot" in normalized:
                normalized["lot"] = _resolve_lot_reference(normalized.get("lot"), context=self.context)
        return super().to_internal_value(normalized)

    class Meta:
        model = MaterialRequisitionItem
        fields = ("position", "lot", "product", "warehouse_item", "requested_quantity", "notes")


class MaterialRequisitionItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = MATERIAL_REQUISITION_ITEM_ALIASES
    legacy_output_aliases = MATERIAL_REQUISITION_ITEM_ALIASES

    available_quantity = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True, default=None)
    lot_expiration_date = serializers.DateField(source="lot.expiration_date", read_only=True, default=None)
    warehouse_item_sku = serializers.CharField(source="warehouse_item.sku", read_only=True, default=None)
    warehouse_item_name = serializers.CharField(source="warehouse_item.name", read_only=True, default=None)

    def get_available_quantity(self, obj):
        try:
            return int(obj.available_quantity)
        except Exception:
            return 0

    def get_product_name(self, obj):
        if obj.lot_id:
            return getattr(getattr(obj.lot, "product", None), "name", None)
        if obj.product_id:
            return getattr(obj.product, "name", None)
        if obj.warehouse_item_id:
            return getattr(obj.warehouse_item, "name", None)
        return None

    class Meta:
        model = MaterialRequisitionItem
        fields = "__all__"
        read_only_fields = (
            "tenant",
            "custom_id",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "deleted",
            "deleted_at",
            "deleted_by",
            "version",
            "supplied_quantity",
        )
        extra_kwargs = {
            "supplied_quantity": {"read_only": True},
        }


class MaterialRequisitionSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = MATERIAL_REQUISITION_ALIASES
    legacy_output_aliases = MATERIAL_REQUISITION_ALIASES

    items = MaterialRequisitionItemSerializer(many=True, read_only=True)
    items_input = MaterialRequisitionItemWriteSerializer(many=True, write_only=True, required=True)
    created_by_name = serializers.SerializerMethodField()
    sector_label = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    source_label = serializers.SerializerMethodField()

    def get_source_label(self, obj):
        try:
            return obj.get_source_display()
        except Exception:
            return getattr(obj, "source", None)

    def get_created_by_name(self, obj):
        u = getattr(obj, "created_by", None)
        if not u:
            return "-"
        name = f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip()
        return name or getattr(u, "username", "") or str(getattr(u, "id", ""))

    def get_sector_label(self, obj):
        try:
            return obj.get_sector_display()
        except Exception:
            return obj.sector

    def get_status_label(self, obj):
        try:
            return obj.get_status_display()
        except Exception:
            return obj.status

    def validate_items_input(self, items):
        if not items:
            raise serializers.ValidationError("Informe pelo menos 1 item.")

        request = self.context.get("request")
        request_tenant = getattr(request, "tenant", None)

        for idx, item in enumerate(items):
            lot = item.get("lot")
            product = item.get("product")
            warehouse_item = item.get("warehouse_item")
            provided = [x for x in (lot, product, warehouse_item) if x]
            if len(provided) != 1:
                raise serializers.ValidationError(
                    f"Item {idx + 1}: informe exatamente um — lote, produto ou item de armazém."
                )

            target = provided[0]
            target_label = "lote" if lot else ("produto" if product else "item de armazém")

            if getattr(target, "deleted", False):
                raise serializers.ValidationError(
                    f"Item {idx + 1}: o {target_label} selecionado está indisponível."
                )

            if request_tenant is not None and getattr(target, "tenant_id", None) != getattr(
                request_tenant, "id", None
            ):
                raise serializers.ValidationError(
                    f"Item {idx + 1}: o {target_label} não pertence ao tenant atual."
                )

        return items

    class Meta:
        model = MaterialRequisition
        fields = "__all__"
        read_only_fields = (
            "tenant",
            "custom_id",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "deleted",
            "deleted_at",
            "deleted_by",
            "version",
            "status",
            "source",
            "requested_by_department",
            "hold_reason",
            "fulfilled_at",
            "fulfilled_by",
            "on_hold_at",
            "on_hold_by",
        )
        extra_kwargs = {
            "sector": {"required": False},
            "tenant": {"read_only": True},
        }

    def create(self, validated_data):
        items = validated_data.pop("items_input", [])
        requisition = MaterialRequisition.objects.create(**validated_data)
        for item in items:
            MaterialRequisitionItem.objects.create(
                requisition=requisition,
                **item,
            )
        return requisition


class ParentCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentCategory
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class ProductCategorySerializer(serializers.ModelSerializer):
    parent_category_name = serializers.CharField(source="parent_category.name", read_only=True, default=None)

    class Meta:
        model = ProductCategory
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "sale_item": SaleItemSerializer,
    "lot": LotSerializer,
    "inventory_movement": InventoryMovementSerializer,
    "product": ProductSerializer,
    "material_requisition": MaterialRequisitionSerializer,
    "material_requisition_item": MaterialRequisitionItemSerializer,
    "sale": SaleSerializer,
    "parent-categories": ParentCategorySerializer,
    "product-categories": ProductCategorySerializer,
}
