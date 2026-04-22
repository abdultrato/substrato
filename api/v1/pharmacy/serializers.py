from rest_framework import serializers

from apps.pharmacy.models.inventory_movement import InventoryMovement
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.material_requisition import MaterialRequisition
from apps.pharmacy.models.material_requisition_item import MaterialRequisitionItem
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = "__all__"
        extra_kwargs = {
            "unit_price": {"read_only": True},
        }


class LotSerializer(serializers.ModelSerializer):
    saldo = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="product.name", read_only=True)

    def get_saldo(self, obj):
        try:
            return int(getattr(obj, "saldo", None) or obj.balance())
        except Exception:
            return 0

    class Meta:
        model = Lot
        fields = "__all__"


class InventoryMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryMovement
        fields = "__all__"


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class SaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sale
        fields = "__all__"


class MaterialRequisitionItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialRequisitionItem
        fields = ("lot", "requested_quantity", "notes")


class MaterialRequisitionItemSerializer(serializers.ModelSerializer):
    available_quantity = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="lot.product.name", read_only=True)
    lot_number = serializers.CharField(source="lot.lot_number", read_only=True)
    lot_expiration_date = serializers.DateField(source="lot.expiration_date", read_only=True)

    def get_available_quantity(self, obj):
        try:
            return int(obj.lot.balance())
        except Exception:
            return 0

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


class MaterialRequisitionSerializer(serializers.ModelSerializer):
    items = MaterialRequisitionItemSerializer(many=True, read_only=True)
    items_input = MaterialRequisitionItemWriteSerializer(many=True, write_only=True, required=True)
    created_by_name = serializers.SerializerMethodField()

    def get_created_by_name(self, obj):
        u = getattr(obj, "created_by", None)
        if not u:
            return "-"
        name = f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip()
        return name or getattr(u, "username", "") or str(getattr(u, "id", ""))

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


SERIALIZER_MAP = {
    "itemvenda": SaleItemSerializer,
    "lot": LotSerializer,
    "movimentoestoque": InventoryMovementSerializer,
    "product": ProductSerializer,
    "requisicaomaterial": MaterialRequisitionSerializer,
    "requisicaomaterialitem": MaterialRequisitionItemSerializer,
    "sale": SaleSerializer,
}
