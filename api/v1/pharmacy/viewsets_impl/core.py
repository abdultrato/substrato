from datetime import datetime

from django.db.models import Count, Q, Sum
from django.db import transaction
from django.http import HttpResponse
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


def _parse_query_date(value: str | None, *, field_name: str):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value)).date()
    except Exception as exc:
        raise ValidationError({field_name: "Use o formato YYYY-MM-DD."}) from exc


def _truthy(value) -> bool:
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "t", "yes", "sim"}


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

    @action(detail=False, methods=["get"], url_path="estoque/pdf", url_name="estoque-pdf")
    def stock_pdf(self, request):
        """Gera PDF do estoque existente (snapshot atual de lotes com saldo)."""
        include_expired = _truthy(request.query_params.get("include_expired"))
        date_from = _parse_query_date(request.query_params.get("date_from"), field_name="date_from")
        date_to = _parse_query_date(request.query_params.get("date_to"), field_name="date_to")

        qs = self.get_queryset().select_related("product").filter(deleted=False).order_by("product__name", "expiration_date")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        rows = []
        total_balance = 0
        for lot in qs:
            balance = int(lot.balance() or 0)
            if balance <= 0:
                continue
            if lot.vencido and not include_expired:
                continue

            total_balance += balance
            rows.append(
                {
                    "product_name": getattr(getattr(lot, "product", None), "name", "—"),
                    "lot_number": lot.lot_number,
                    "expiration_date": lot.expiration_date.isoformat() if lot.expiration_date else None,
                    "balance": balance,
                    "sale_price": str(getattr(lot, "sale_price", "0.00") or "0.00"),
                    "is_expired": bool(lot.vencido),
                }
            )

        summary = {
            "lots_count": len(rows),
            "products_count": len({r["product_name"] for r in rows}),
            "total_balance": total_balance,
        }
        payload = {
            "report_type": "stock",
            "generated_at": timezone.localtime().isoformat(),
            "filters": {
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None,
                "include_expired": include_expired,
            },
            "summary": summary,
            "rows": rows,
        }

        from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_stock_pdf

        pdf_bytes, filename = generate_pharmacy_stock_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


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

    @action(detail=False, methods=["get"], url_path="historico/pdf", url_name="historico-pdf")
    def history_pdf(self, request):
        """
        Gera PDF de histórico de entradas/saídas/ajustes.
        Filtros: date_from, date_to, type, origin, sector.
        """
        date_from = _parse_query_date(request.query_params.get("date_from"), field_name="date_from")
        date_to = _parse_query_date(request.query_params.get("date_to"), field_name="date_to")
        movement_type = (request.query_params.get("type") or "").strip().upper()
        origin = (request.query_params.get("origin") or "").strip().upper()
        sector = (request.query_params.get("sector") or "").strip().upper()
        limit_raw = request.query_params.get("limit")
        try:
            limit = int(limit_raw) if limit_raw not in (None, "") else 500
        except Exception as exc:
            raise ValidationError({"limit": "Valor inválido para limit."}) from exc
        limit = max(1, min(limit, 2000))

        qs = self.get_queryset().filter(deleted=False).select_related(
            "lot__product",
            "material_request_item__requisition",
        )
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if movement_type in {"ENT", "SAI", "AJU"}:
            qs = qs.filter(type=movement_type)
        if origin in {"VEND", "PROC", "AJUS", "REQ"}:
            qs = qs.filter(origin=origin)
        if sector:
            qs = qs.filter(material_request_item__requisition__sector=sector)

        summary_raw = qs.aggregate(
            moves_count=Count("id"),
            total_entries=Sum("quantity", filter=Q(type="ENT")),
            total_exits=Sum("quantity", filter=Q(type="SAI")),
            total_adjustments=Sum("quantity", filter=Q(type="AJU")),
        )

        rows = []
        for movement in qs.order_by("-created_at")[:limit]:
            req = getattr(getattr(movement, "material_request_item", None), "requisition", None)
            rows.append(
                {
                    "created_at": timezone.localtime(movement.created_at).strftime("%d/%m/%Y %H:%M"),
                    "movement_code": movement.custom_id or movement.id,
                    "type": movement.get_type_display(),
                    "origin": movement.get_origin_display(),
                    "product_name": getattr(getattr(movement.lot, "product", None), "name", "—"),
                    "lot_number": getattr(movement.lot, "lot_number", "—"),
                    "quantity": int(movement.quantity or 0),
                    "sector": req.get_sector_display() if req else "—",
                    "requisition_code": getattr(req, "custom_id", None) or (f"#{req.id}" if req else "—"),
                }
            )

        payload = {
            "report_type": "movements",
            "generated_at": timezone.localtime().isoformat(),
            "filters": {
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None,
                "type": movement_type or None,
                "origin": origin or None,
                "sector": sector or None,
                "limit": limit,
            },
            "summary": {
                "moves_count": int(summary_raw.get("moves_count") or 0),
                "total_entries": int(summary_raw.get("total_entries") or 0),
                "total_exits": int(summary_raw.get("total_exits") or 0),
                "total_adjustments": int(summary_raw.get("total_adjustments") or 0),
            },
            "rows": rows,
        }

        from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_movements_pdf

        pdf_bytes, filename = generate_pharmacy_movements_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


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

    @staticmethod
    def _parse_int_param(raw_value, *, field_name: str, min_value: int, max_value: int, default: int) -> int:
        value = default if raw_value in (None, "") else raw_value
        try:
            parsed = int(value)
        except Exception as exc:
            raise ValidationError({field_name: "Valor numérico inválido."}) from exc
        if parsed < min_value or parsed > max_value:
            raise ValidationError({field_name: f"Valor deve estar entre {min_value} e {max_value}."})
        return parsed

    def _base_requisition_items(self, request):
        date_from = _parse_query_date(request.query_params.get("date_from"), field_name="date_from")
        date_to = _parse_query_date(request.query_params.get("date_to"), field_name="date_to")

        qs = MaterialRequisitionItem.objects.filter(
            deleted=False,
            requisition__deleted=False,
            lot__deleted=False,
            lot__product__deleted=False,
        ).select_related(
            "lot__product",
            "requisition",
        )
        tenant = getattr(request, "tenant", None)
        if tenant is not None:
            qs = qs.filter(tenant=tenant)
        if date_from:
            qs = qs.filter(requisition__created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(requisition__created_at__date__lte=date_to)
        return qs, date_from, date_to

    @staticmethod
    def _product_type_label(product_type: str | None) -> str:
        return dict(Product.ProductType.choices).get(product_type, product_type or "—")

    @action(detail=False, methods=["get"], url_path="consumo/pdf", url_name="consumo-pdf")
    def product_consumption_pdf(self, request):
        """PDF de consumo farmacêutico consolidado por produto."""
        user = getattr(request, "user", None)
        if not _is_pharmacy_user(user):
            raise ValidationError("Apenas Farmácia pode emitir relatório de consumo por produto.")

        qs, date_from, date_to = self._base_requisition_items(request)
        raw_product_id = request.query_params.get("product_id") or request.query_params.get("produto")
        product_id = None
        if raw_product_id not in (None, ""):
            product_id = self._parse_int_param(
                raw_product_id,
                field_name="product_id",
                min_value=1,
                max_value=999999999,
                default=0,
            )
            qs = qs.filter(lot__product_id=product_id)

        grouped = (
            qs.values(
                "lot__product_id",
                "lot__product__custom_id",
                "lot__product__name",
                "lot__product__type",
            )
            .annotate(
                requested_quantity=Sum("requested_quantity"),
                supplied_quantity=Sum("supplied_quantity"),
                requisitions_count=Count("requisition", distinct=True),
                items_count=Count("id"),
            )
            .order_by("lot__product__name")
        )

        rows = [
            {
                "product_id": row.get("lot__product_id"),
                "product_code": row.get("lot__product__custom_id") or row.get("lot__product_id"),
                "product_name": row.get("lot__product__name") or "—",
                "product_type": self._product_type_label(row.get("lot__product__type")),
                "requested_quantity": int(row.get("requested_quantity") or 0),
                "supplied_quantity": int(row.get("supplied_quantity") or 0),
                "requisitions_count": int(row.get("requisitions_count") or 0),
                "items_count": int(row.get("items_count") or 0),
            }
            for row in grouped
        ]

        summary = {
            "products_count": len(rows),
            "requested_total": sum(r["requested_quantity"] for r in rows),
            "supplied_total": sum(r["supplied_quantity"] for r in rows),
            "requisitions_count": sum(r["requisitions_count"] for r in rows),
        }

        payload = {
            "report_type": "product_consumption",
            "generated_at": timezone.localtime().isoformat(),
            "filters": {
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None,
                "product_id": product_id,
            },
            "summary": summary,
            "rows": rows,
        }

        from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_product_consumption_pdf

        pdf_bytes, filename = generate_pharmacy_product_consumption_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path="mais_requisitados/pdf", url_name="mais-requisitados-pdf")
    def most_requested_products_pdf(self, request):
        """PDF com os produtos mais requisitados (baseado em requisições de material)."""
        user = getattr(request, "user", None)
        if not _is_pharmacy_user(user):
            raise ValidationError("Apenas Farmácia pode emitir relatório de produtos mais requisitados.")

        qs, date_from, date_to = self._base_requisition_items(request)
        limit = self._parse_int_param(
            request.query_params.get("limit"),
            field_name="limit",
            min_value=1,
            max_value=200,
            default=20,
        )

        grouped = (
            qs.values(
                "lot__product_id",
                "lot__product__custom_id",
                "lot__product__name",
                "lot__product__type",
            )
            .annotate(
                requested_quantity=Sum("requested_quantity"),
                supplied_quantity=Sum("supplied_quantity"),
                requisitions_count=Count("requisition", distinct=True),
            )
            .order_by("-requested_quantity", "lot__product__name")[:limit]
        )

        rows = []
        for idx, row in enumerate(grouped, start=1):
            rows.append(
                {
                    "rank": idx,
                    "product_id": row.get("lot__product_id"),
                    "product_code": row.get("lot__product__custom_id") or row.get("lot__product_id"),
                    "product_name": row.get("lot__product__name") or "—",
                    "product_type": self._product_type_label(row.get("lot__product__type")),
                    "requested_quantity": int(row.get("requested_quantity") or 0),
                    "supplied_quantity": int(row.get("supplied_quantity") or 0),
                    "requisitions_count": int(row.get("requisitions_count") or 0),
                }
            )

        payload = {
            "report_type": "top_requested_products",
            "generated_at": timezone.localtime().isoformat(),
            "filters": {
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None,
                "limit": limit,
            },
            "summary": {
                "limit": limit,
                "products_count": len(rows),
                "requested_total": sum(r["requested_quantity"] for r in rows),
                "supplied_total": sum(r["supplied_quantity"] for r in rows),
            },
            "rows": rows,
        }

        from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_top_requested_products_pdf

        pdf_bytes, filename = generate_pharmacy_top_requested_products_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path="menos_requisitados/pdf", url_name="menos-requisitados-pdf")
    def least_requested_products_pdf(self, request):
        """PDF com os produtos menos requisitados (baseado em requisições de material)."""
        user = getattr(request, "user", None)
        if not _is_pharmacy_user(user):
            raise ValidationError("Apenas Farmácia pode emitir relatório de produtos menos requisitados.")

        qs, date_from, date_to = self._base_requisition_items(request)
        limit = self._parse_int_param(
            request.query_params.get("limit"),
            field_name="limit",
            min_value=1,
            max_value=200,
            default=20,
        )

        grouped = (
            qs.values(
                "lot__product_id",
                "lot__product__custom_id",
                "lot__product__name",
                "lot__product__type",
            )
            .annotate(
                requested_quantity=Sum("requested_quantity"),
                supplied_quantity=Sum("supplied_quantity"),
                requisitions_count=Count("requisition", distinct=True),
            )
            .order_by("requested_quantity", "lot__product__name")[:limit]
        )

        rows = []
        for idx, row in enumerate(grouped, start=1):
            rows.append(
                {
                    "rank": idx,
                    "product_id": row.get("lot__product_id"),
                    "product_code": row.get("lot__product__custom_id") or row.get("lot__product_id"),
                    "product_name": row.get("lot__product__name") or "—",
                    "product_type": self._product_type_label(row.get("lot__product__type")),
                    "requested_quantity": int(row.get("requested_quantity") or 0),
                    "supplied_quantity": int(row.get("supplied_quantity") or 0),
                    "requisitions_count": int(row.get("requisitions_count") or 0),
                }
            )

        payload = {
            "report_type": "least_requested_products",
            "generated_at": timezone.localtime().isoformat(),
            "filters": {
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None,
                "limit": limit,
            },
            "summary": {
                "limit": limit,
                "products_count": len(rows),
                "requested_total": sum(r["requested_quantity"] for r in rows),
                "supplied_total": sum(r["supplied_quantity"] for r in rows),
            },
            "rows": rows,
        }

        from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_least_requested_products_pdf

        pdf_bytes, filename = generate_pharmacy_least_requested_products_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path="setores_requisicao/pdf", url_name="setores-requisicao-pdf")
    def product_sector_demand_pdf(self, request):
        """PDF com os setores que mais requisitaram um produto específico."""
        user = getattr(request, "user", None)
        if not _is_pharmacy_user(user):
            raise ValidationError("Apenas Farmácia pode emitir relatório de setores por produto.")

        raw_product_id = request.query_params.get("product_id") or request.query_params.get("produto")
        product_id = self._parse_int_param(
            raw_product_id,
            field_name="product_id",
            min_value=1,
            max_value=999999999,
            default=0,
        )

        product = self.get_queryset().filter(deleted=False, pk=product_id).first()
        if not product:
            raise ValidationError({"product_id": "Produto não encontrado no tenant."})

        qs, date_from, date_to = self._base_requisition_items(request)
        qs = qs.filter(lot__product_id=product_id)

        grouped = (
            qs.values("requisition__sector", "requisition__requested_by_department")
            .annotate(
                requested_quantity=Sum("requested_quantity"),
                supplied_quantity=Sum("supplied_quantity"),
                requisitions_count=Count("requisition", distinct=True),
                items_count=Count("id"),
            )
            .order_by("-requested_quantity", "requisition__sector")
        )

        sector_labels = dict(RequestingSector.choices)
        rows = [
            {
                "sector": sector_labels.get(row.get("requisition__sector"), row.get("requisition__sector") or "—"),
                "department": row.get("requisition__requested_by_department") or "—",
                "requested_quantity": int(row.get("requested_quantity") or 0),
                "supplied_quantity": int(row.get("supplied_quantity") or 0),
                "requisitions_count": int(row.get("requisitions_count") or 0),
                "items_count": int(row.get("items_count") or 0),
            }
            for row in grouped
        ]

        payload = {
            "report_type": "product_sector_demand",
            "generated_at": timezone.localtime().isoformat(),
            "filters": {
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None,
                "product_id": product_id,
            },
            "summary": {
                "product_id": product_id,
                "product_code": product.custom_id or product_id,
                "product_name": product.name,
                "sectors_count": len(rows),
                "requested_total": sum(r["requested_quantity"] for r in rows),
                "supplied_total": sum(r["supplied_quantity"] for r in rows),
                "requisitions_count": sum(r["requisitions_count"] for r in rows),
            },
            "rows": rows,
        }

        from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_product_sector_demand_pdf

        pdf_bytes, filename = generate_pharmacy_product_sector_demand_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


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


def _requester_sectors_from_user(user) -> set[str]:
    groups = _user_groups(user)
    sectors: set[str] = set()
    if _normalize(RBAC_GROUPS["LABORATORIO"]) in groups:
        sectors.add(RequestingSector.LABORATORIO)
    if _normalize(RBAC_GROUPS["ENFERMAGEM"]) in groups:
        sectors.add(RequestingSector.ENFERMAGEM)
    if _normalize(RBAC_GROUPS["RECEPCAO"]) in groups:
        sectors.add(RequestingSector.RECEPCAO)
    if _normalize(RBAC_GROUPS["MEDICINA"]) in groups:
        sectors.add(RequestingSector.MEDICINA)
    if _normalize(RBAC_GROUPS["MEDICINA_OCUPACIONAL"]) in groups:
        sectors.add(RequestingSector.MEDICINA_OCUPACIONAL)
    return sectors


def _has_non_pharmacy_group(user) -> bool:
    groups = _user_groups(user)
    if not groups:
        return False

    blocked = {
        _normalize(RBAC_GROUPS["FARMACIA"]),
        _normalize(RBAC_GROUPS["ADMIN"]),
    }
    return any(g not in blocked for g in groups)


def _infer_sector_from_user(user) -> str | None:
    sectors = _requester_sectors_from_user(user)
    # Ordem de precedência para utilizadores com múltiplos perfis.
    order = [
        RequestingSector.LABORATORIO,
        RequestingSector.ENFERMAGEM,
        RequestingSector.RECEPCAO,
        RequestingSector.MEDICINA,
        RequestingSector.MEDICINA_OCUPACIONAL,
    ]
    for sector in order:
        if sector in sectors:
            return sector
    if _has_non_pharmacy_group(user):
        return RequestingSector.OUTROS
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
        requester_sectors = _requester_sectors_from_user(user)
        if requester_sectors:
            return qs.filter(sector__in=list(requester_sectors))
        return qs.filter(created_by=user)

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)

        sector = _infer_sector_from_user(user)
        if not sector:
            if getattr(user, "is_superuser", False):
                sector = RequestingSector.OUTROS
            else:
                raise ValidationError(
                    "Este perfil não pode criar requisição de material. "
                    "A criação deve ser feita por setores solicitantes."
                )

        department = ""
        try:
            department = getattr(getattr(user, "perfil_professional", None), "department", "") or ""
        except Exception:
            department = ""

        serializer.save(
            sector=sector,
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
                    raise ValidationError(
                        {
                            "quantity": (
                                f"Não é possível aviar {qty} unidade(s) do item {item.id}; "
                                f"estoque disponível: {available}."
                            )
                        }
                    )

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

    @action(detail=False, methods=["get"], url_path="historico_movimentos/pdf", url_name="historico-movimentos-pdf")
    def sector_movements_pdf(self, request):
        """
        PDF de movimentos de insumos por setor solicitante.
        Uso principal: equipe da farmácia.
        """
        user = getattr(request, "user", None)
        if not _is_pharmacy_user(user):
            raise ValidationError("Apenas Farmácia pode emitir histórico de movimentos por setor.")

        date_from = _parse_query_date(request.query_params.get("date_from"), field_name="date_from")
        date_to = _parse_query_date(request.query_params.get("date_to"), field_name="date_to")
        sector = (request.query_params.get("sector") or "").strip().upper()

        requisitions_qs = self.get_queryset().filter(deleted=False)
        if sector:
            requisitions_qs = requisitions_qs.filter(sector=sector)

        movements_qs = InventoryMovement.objects.filter(
            deleted=False,
            origin="REQ",
            material_request_item__requisition__in=requisitions_qs,
        ).select_related(
            "lot__product",
            "material_request_item__requisition",
        )
        if date_from:
            movements_qs = movements_qs.filter(created_at__date__gte=date_from)
        if date_to:
            movements_qs = movements_qs.filter(created_at__date__lte=date_to)

        summary_raw = movements_qs.aggregate(
            moves_count=Count("id"),
            total_quantity=Sum("quantity"),
            requisitions_count=Count("material_request_item__requisition", distinct=True),
        )

        rows = []
        for movement in movements_qs.order_by("-created_at")[:2000]:
            req = movement.material_request_item.requisition
            rows.append(
                {
                    "created_at": timezone.localtime(movement.created_at).strftime("%d/%m/%Y %H:%M"),
                    "requisition_code": req.custom_id or f"#{req.id}",
                    "sector": req.get_sector_display(),
                    "department": req.requested_by_department or "—",
                    "product_name": getattr(getattr(movement.lot, "product", None), "name", "—"),
                    "lot_number": getattr(movement.lot, "lot_number", "—"),
                    "quantity": int(movement.quantity or 0),
                }
            )

        payload = {
            "report_type": "sector_movements",
            "generated_at": timezone.localtime().isoformat(),
            "filters": {
                "date_from": date_from.isoformat() if date_from else None,
                "date_to": date_to.isoformat() if date_to else None,
                "sector": sector or None,
            },
            "summary": {
                "moves_count": int(summary_raw.get("moves_count") or 0),
                "total_quantity": int(summary_raw.get("total_quantity") or 0),
                "requisitions_count": int(summary_raw.get("requisitions_count") or 0),
            },
            "rows": rows,
        }

        from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_sector_movements_pdf

        pdf_bytes, filename = generate_pharmacy_sector_movements_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


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
        requester_sectors = _requester_sectors_from_user(user)
        if requester_sectors:
            return qs.filter(requisition__sector__in=list(requester_sectors))
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
