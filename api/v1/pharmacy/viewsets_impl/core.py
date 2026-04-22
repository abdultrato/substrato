from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.pharmacy.models.inventory_movement import InventoryMovement
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.material_requisition import MaterialRequisition, MaterialRequisitionStatus, RequestingSector
from apps.pharmacy.models.material_requisition_item import MaterialRequisitionItem
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem
from security.permissions.rbac import GROUPS as RBAC_GROUPS, _normalize

from ..filters import (
    InventoryMovementFilter,
    LotFilter,
    MaterialRequisitionFilter,
    MaterialRequisitionItemFilter,
    ProductFilter,
    SaleFilter,
    SaleItemFilter,
)
from ..serializers import (
    InventoryMovementSerializer,
    LotSerializer,
    MaterialRequisitionItemSerializer,
    MaterialRequisitionSerializer,
    ProductSerializer,
    SaleItemSerializer,
    SaleSerializer,
)


class SaleItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SaleItem.objects.all()
    serializer_class = SaleItemSerializer
    filterset_class = SaleItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "product__name", "sale__number"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "sale",
        "product",
        "quantity",
        "unit_price",
        "version",
    ]
    ordering = ["-created_at"]


class LotViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Lot.objects.all()
    serializer_class = LotSerializer
    filterset_class = LotFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "lot_number", "product__name"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "product",
        "lot_number",
        "expiration_date",
        "initial_quantity",
        "version",
    ]
    ordering = ["-created_at"]

    @action(detail=False, methods=["get"], url_path="disponiveis", url_name="disponiveis")
    def disponiveis(self, request):
        """
        Lista lotes FEFO com saldo > 0 e não vencidos.
        Útil para criação de requisições internas (logística).
        """
        product_id = request.query_params.get("product")
        base_qs = self.get_queryset().select_related("product")

        if product_id:
            base_qs = base_qs.filter(product_id=product_id)
            lot_obj = base_qs.first()
            if not lot_obj:
                return Response([])
            # Lot.disponiveis() retorna FEFO com saldo, já filtra vencidos/saldo>0.
            lots = list(Lot.disponiveis(lot_obj.product).filter(tenant_id=lot_obj.tenant_id))
            return Response(LotSerializer(lots, many=True).data)

        # Sem filtro por produto: devolve lotes com saldo>0 (filtragem leve em runtime).
        lots = [lot for lot in base_qs if (not lot.vencido and lot.balance() > 0)]
        return Response(LotSerializer(lots, many=True).data)


class InventoryMovementViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InventoryMovement.objects.all()
    serializer_class = InventoryMovementSerializer
    filterset_class = InventoryMovementFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "type", "origin", "lot__lot_number", "sale_item__custom_id"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "lot",
        "type",
        "origin",
        "sale_item",
        "quantity",
        "version",
    ]
    ordering = ["-created_at"]


class ProductViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_class = ProductFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "type"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "name",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "type",
        "sale_price",
        "vat_percentage",
        "category",
        "version",
    ]
    ordering = ["-created_at"]


class SaleViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    filterset_class = SaleFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "number", "patient__custom_id", "patient__name"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "number",
        "patient",
        "invoice",
        "total",
        "version",
    ]
    ordering = ["-created_at"]


VIEWSET_MAP = {
    "itemvenda": SaleItemViewSet,
    "lot": LotViewSet,
    "movimentoestoque": InventoryMovementViewSet,
    "product": ProductViewSet,
    "requisicaomaterial": None,
    "requisicaomaterialitem": None,
    "sale": SaleViewSet,
}


def _user_groups(user) -> set[str]:
    try:
        raw_groups = list(user.groups.values_list("name", flat=True))
    except Exception:
        raw_groups = []
    return {_normalize(g) for g in raw_groups if g}


def _is_pharmacy_user(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    groups = _user_groups(user)
    return _normalize(RBAC_GROUPS["FARMACIA"]) in groups or _normalize(RBAC_GROUPS["ADMIN"]) in groups


def _infer_sector_from_user(user) -> str | None:
    groups = _user_groups(user)
    if _normalize(RBAC_GROUPS["LABORATORIO"]) in groups:
        return RequestingSector.LABORATORIO
    if _normalize(RBAC_GROUPS["ENFERMAGEM"]) in groups:
        return RequestingSector.ENFERMAGEM
    if _normalize(RBAC_GROUPS["RECEPCAO"]) in groups:
        return RequestingSector.RECEPCAO
    return None


class MaterialRequisitionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MaterialRequisition.objects.prefetch_related("items", "items__lot", "items__lot__product").select_related(
        "created_by",
        "fulfilled_by",
        "on_hold_by",
    )
    serializer_class = MaterialRequisitionSerializer
    filterset_class = MaterialRequisitionFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "requested_by_department", "created_by__username", "created_by__first_name", "created_by__last_name"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "sector",
        "requested_by_department",
        "status",
        "fulfilled_at",
        "on_hold_at",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if _is_pharmacy_user(user):
            return qs
        if not user or not getattr(user, "is_authenticated", False):
            return qs.none()
        return qs.filter(created_by=user)

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)

        sector = _infer_sector_from_user(user)
        if not sector and not getattr(user, "is_superuser", False):
            raise ValidationError("Não foi possível inferir o setor do utilizador para criar a requisição.")

        department = ""
        try:
            department = getattr(getattr(user, "perfil_professional", None), "department", "") or ""
        except Exception:
            department = ""

        serializer.save(
            sector=sector or serializer.validated_data.get("sector") or RequestingSector.RECEPCAO,
            requested_by_department=department,
            status=MaterialRequisitionStatus.PENDING,
        )

    @action(detail=True, methods=["post"], url_path="aviar", url_name="aviar")
    def fulfill(self, request, pk=None):
        user = getattr(request, "user", None)
        if not _is_pharmacy_user(user):
            raise ValidationError("Apenas Farmácia pode aviar requisições.")

        requisition: MaterialRequisition = self.get_object()
        if requisition.status == MaterialRequisitionStatus.ON_HOLD:
            raise ValidationError("Requisição arquivada não pode ser aviada sem reativação.")

        payload_items = request.data.get("items") or []
        if not isinstance(payload_items, list) or not payload_items:
            raise ValidationError({"items": "Informe uma lista de itens para aviar."})

        by_id: dict[int, dict] = {}
        for it in payload_items:
            try:
                item_id = int(it.get("id"))
            except Exception:
                continue
            by_id[item_id] = it

        if not by_id:
            raise ValidationError({"items": "Itens inválidos."})

        with transaction.atomic():
            for item in requisition.items.select_related("lot").all():
                it = by_id.get(item.id)
                if not it:
                    continue

                remaining = max(0, int(item.requested_quantity) - int(item.supplied_quantity or 0))
                if remaining <= 0:
                    continue

                qty_raw = it.get("quantity", remaining)
                try:
                    qty = int(qty_raw)
                except Exception:
                    raise ValidationError({"quantity": f"Quantidade inválida para item {item.id}."})

                if qty <= 0:
                    continue

                available = int(item.lot.balance())
                if qty > remaining:
                    raise ValidationError({"quantity": f"Quantidade maior que o solicitado (item {item.id})."})
                if qty > available:
                    raise ValidationError({"quantity": f"Estoque insuficiente (item {item.id}). Disponível: {available}."})

                InventoryMovement.objects.create(
                    tenant=item.tenant,
                    lot=item.lot,
                    type="SAI",
                    origin="REQ",
                    quantity=qty,
                    material_request_item=item,
                )

                item.supplied_quantity = int(item.supplied_quantity or 0) + qty
                item.save(update_fields=["supplied_quantity", "updated_at", "updated_by"])

            requisition.refresh_from_db()
            items = list(requisition.items.all())
            any_supplied = any((i.supplied_quantity or 0) > 0 for i in items)
            all_supplied = all((i.supplied_quantity or 0) >= (i.requested_quantity or 0) for i in items) if items else False

            next_status = requisition.status
            if all_supplied:
                next_status = MaterialRequisitionStatus.FULFILLED
                requisition.fulfilled_at = timezone.now()
                requisition.fulfilled_by = user
            elif any_supplied:
                next_status = MaterialRequisitionStatus.PARTIAL

            requisition.status = next_status
            requisition.save(update_fields=["status", "fulfilled_at", "fulfilled_by", "updated_at", "updated_by"])

        return Response(self.get_serializer(requisition).data)

    @action(detail=True, methods=["post"], url_path="arquivar", url_name="arquivar")
    def on_hold(self, request, pk=None):
        user = getattr(request, "user", None)
        if not _is_pharmacy_user(user):
            raise ValidationError("Apenas Farmácia pode arquivar requisições.")

        requisition: MaterialRequisition = self.get_object()
        reason = request.data.get("reason") or request.data.get("motivo") or None

        requisition.status = MaterialRequisitionStatus.ON_HOLD
        requisition.hold_reason = reason
        requisition.on_hold_at = timezone.now()
        requisition.on_hold_by = user
        requisition.save(update_fields=["status", "hold_reason", "on_hold_at", "on_hold_by", "updated_at", "updated_by"])

        return Response(self.get_serializer(requisition).data)


class MaterialRequisitionItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MaterialRequisitionItem.objects.select_related("requisition", "lot", "lot__product").all()
    serializer_class = MaterialRequisitionItemSerializer
    filterset_class = MaterialRequisitionItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "lot__product__name", "lot__lot_number", "requisition__custom_id"]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "requisition",
        "lot",
        "requested_quantity",
        "supplied_quantity",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if _is_pharmacy_user(user):
            return qs
        if not user or not getattr(user, "is_authenticated", False):
            return qs.none()
        return qs.filter(requisition__created_by=user)


VIEWSET_MAP["requisicaomaterial"] = MaterialRequisitionViewSet
VIEWSET_MAP["requisicaomaterialitem"] = MaterialRequisitionItemViewSet

__all__ = [
    "VIEWSET_MAP",
    "InventoryMovementViewSet",
    "LotViewSet",
    "MaterialRequisitionItemViewSet",
    "MaterialRequisitionViewSet",
    "ProductViewSet",
    "SaleItemViewSet",
    "SaleViewSet",
]

