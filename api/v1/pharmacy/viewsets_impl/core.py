from datetime import datetime
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.utils.async_exports import queue_export_if_requested
from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.billing.models.invoice import Invoice
from apps.pharmacy.models.inventory_movement import InventoryMovement
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.material_requisition import (
    MaterialRequisition,
    MaterialRequisitionStatus,
    RequestingSector,
    RequisitionSource,
    source_for_sector,
)
from apps.pharmacy.models.material_requisition_item import MaterialRequisitionItem
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ParentCategory, ProductCategory
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem
from security.permissions.rbac import GROUPS as RBAC_GROUPS, _normalize

from ..filters import (
    InventoryMovementFilter,
    LotFilter,
    MaterialRequisitionFilter,
    MaterialRequisitionItemFilter,
    ParentCategoryFilter,
    ProductCategoryFilter,
    ProductFilter,
    SaleFilter,
    SaleItemFilter,
)
from ..serializers import (
    InventoryMovementSerializer,
    LotSerializer,
    MaterialRequisitionItemSerializer,
    MaterialRequisitionSerializer,
    ParentCategorySerializer,
    ProductCategorySerializer,
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
        "position",
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
    ordering = ["sale", "position", "id"]


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

    @action(detail=False, methods=["get"], url_path="available", url_name="available")
    def available(self, request):
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
            # Lot.available() retorna FEFO com saldo, já filtra vencidos/saldo>0.
            lots = list(Lot.available(lot_obj.product).filter(tenant_id=lot_obj.tenant_id))
            return Response(LotSerializer(lots, many=True).data)

        # Sem filtro por produto: devolve lotes com saldo>0 (filtragem leve em runtime).
        lots = [lot for lot in base_qs if (not lot.is_expired and lot.balance() > 0)]
        return Response(LotSerializer(lots, many=True).data)

    @action(detail=False, methods=["get"], url_path="stock/pdf", url_name="stock-pdf")
    def stock_pdf(self, request):
        """Gera PDF do estoque existente (assíncrono)."""
        include_expired = _truthy(request.query_params.get("include_expired"))
        date_from = _parse_query_date(request.query_params.get("date_from"), field_name="date_from")
        date_to = _parse_query_date(request.query_params.get("date_to"), field_name="date_to")

        qs = (
            self.get_queryset()
            .select_related("product")
            .filter(deleted=False)
            .order_by("product__name", "expiration_date")
        )
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
            if lot.is_expired and not include_expired:
                continue

            total_balance += balance
            rows.append(
                {
                    "product_name": getattr(getattr(lot, "product", None), "name", "—"),
                    "lot_number": lot.lot_number,
                    "expiration_date": lot.expiration_date.isoformat() if lot.expiration_date else None,
                    "balance": balance,
                    "sale_price": str(getattr(lot, "sale_price", "0.00") or "0.00"),
                    "is_expired": bool(lot.is_expired),
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

        queued = queue_export_if_requested(
            request,
            export_key="pharmacy_stock_pdf",
            payload=payload,
            content_disposition="inline",
        )
        if queued is not None:
            return queued

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

    @action(detail=False, methods=["get"], url_path="summary", url_name="summary")
    def summary(self, request):
        """
        Totais agregados de TODOS os movimentos que correspondem aos filtros
        ativos (não apenas a página atual). Usado pelos cartões de resumo.
        """
        qs = self.filter_queryset(self.get_queryset()).filter(deleted=False)
        summary_raw = qs.aggregate(
            moves_count=Count("id"),
            # Contagem de movimentos por tipo (coerente com o total de registos).
            count_entries=Count("id", filter=Q(type="ENT")),
            count_exits=Count("id", filter=Q(type="SAI")),
            count_adjustments=Count("id", filter=Q(type="AJU")),
            # Soma de quantidades por tipo (unidades movimentadas).
            qty_entries=Sum("quantity", filter=Q(type="ENT")),
            qty_exits=Sum("quantity", filter=Q(type="SAI")),
            qty_adjustments=Sum("quantity", filter=Q(type="AJU")),
        )
        return Response(
            {
                "moves_count": int(summary_raw.get("moves_count") or 0),
                "count_entries": int(summary_raw.get("count_entries") or 0),
                "count_exits": int(summary_raw.get("count_exits") or 0),
                "count_adjustments": int(summary_raw.get("count_adjustments") or 0),
                "qty_entries": int(summary_raw.get("qty_entries") or 0),
                "qty_exits": int(summary_raw.get("qty_exits") or 0),
                "qty_adjustments": int(summary_raw.get("qty_adjustments") or 0),
            }
        )

    @action(detail=False, methods=["get"], url_path="history/pdf", url_name="history-pdf")
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

        qs = (
            self.get_queryset()
            .filter(deleted=False)
            .select_related(
                "lot__product",
                "material_request_item__requisition",
            )
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
        queued = queue_export_if_requested(
            request,
            export_key="pharmacy_movements_pdf",
            payload=payload,
            content_disposition="inline",
        )
        if queued is not None:
            return queued

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
        from django.db.models.functions import Coalesce

        date_from = _parse_query_date(request.query_params.get("date_from"), field_name="date_from")
        date_to = _parse_query_date(request.query_params.get("date_to"), field_name="date_to")

        # Itens por lote OU por produto (avio FEFO); itens de armazém ficam fora
        # dos relatórios de consumo da farmácia.
        qs = (
            MaterialRequisitionItem.objects.filter(
                deleted=False,
                requisition__deleted=False,
            )
            .filter(Q(lot__isnull=True) | Q(lot__deleted=False, lot__product__deleted=False))
            .filter(Q(product__isnull=True) | Q(product__deleted=False))
            .exclude(lot__isnull=True, product__isnull=True)
            .select_related(
                "lot__product",
                "product",
                "requisition",
            )
            .annotate(
                product_ref_id=Coalesce("lot__product_id", "product_id"),
                product_ref_custom_id=Coalesce("lot__product__custom_id", "product__custom_id"),
                product_ref_name=Coalesce("lot__product__name", "product__name"),
                product_ref_type=Coalesce("lot__product__type", "product__type"),
            )
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

    @action(detail=False, methods=["get"], url_path="consumption/pdf", url_name="consumption-pdf")
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
            qs = qs.filter(product_ref_id=product_id)

        product_name = (
            request.query_params.get("product_name") or request.query_params.get("nome_produto") or ""
        ).strip()
        if product_name:
            qs = qs.filter(product_ref_name__icontains=product_name)

        grouped = (
            qs.values(
                "product_ref_id",
                "product_ref_custom_id",
                "product_ref_name",
                "product_ref_type",
            )
            .annotate(
                requested_quantity=Sum("requested_quantity"),
                supplied_quantity=Sum("supplied_quantity"),
                requisitions_count=Count("requisition", distinct=True),
                items_count=Count("id"),
            )
            .order_by("product_ref_name")
        )

        rows = [
            {
                "product_id": row.get("product_ref_id"),
                "product_code": row.get("product_ref_custom_id") or row.get("product_ref_id"),
                "product_name": row.get("product_ref_name") or "—",
                "product_type": self._product_type_label(row.get("product_ref_type")),
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
                "product_name": product_name or None,
            },
            "summary": summary,
            "rows": rows,
        }
        queued = queue_export_if_requested(
            request,
            export_key="pharmacy_product_consumption_pdf",
            payload=payload,
            content_disposition="inline",
        )
        if queued is not None:
            return queued

        from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_product_consumption_pdf

        pdf_bytes, filename = generate_pharmacy_product_consumption_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path="most-requested/pdf", url_name="most-requested-pdf")
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
                "product_ref_id",
                "product_ref_custom_id",
                "product_ref_name",
                "product_ref_type",
            )
            .annotate(
                requested_quantity=Sum("requested_quantity"),
                supplied_quantity=Sum("supplied_quantity"),
                requisitions_count=Count("requisition", distinct=True),
            )
            .order_by("-requested_quantity", "product_ref_name")[:limit]
        )

        rows = []
        for idx, row in enumerate(grouped, start=1):
            rows.append(
                {
                    "rank": idx,
                    "product_id": row.get("product_ref_id"),
                    "product_code": row.get("product_ref_custom_id") or row.get("product_ref_id"),
                    "product_name": row.get("product_ref_name") or "—",
                    "product_type": self._product_type_label(row.get("product_ref_type")),
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
        queued = queue_export_if_requested(
            request,
            export_key="pharmacy_top_requested_products_pdf",
            payload=payload,
            content_disposition="inline",
        )
        if queued is not None:
            return queued

        from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_top_requested_products_pdf

        pdf_bytes, filename = generate_pharmacy_top_requested_products_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path="least-requested/pdf", url_name="least-requested-pdf")
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
                "product_ref_id",
                "product_ref_custom_id",
                "product_ref_name",
                "product_ref_type",
            )
            .annotate(
                requested_quantity=Sum("requested_quantity"),
                supplied_quantity=Sum("supplied_quantity"),
                requisitions_count=Count("requisition", distinct=True),
            )
            .order_by("requested_quantity", "product_ref_name")[:limit]
        )

        rows = []
        for idx, row in enumerate(grouped, start=1):
            rows.append(
                {
                    "rank": idx,
                    "product_id": row.get("product_ref_id"),
                    "product_code": row.get("product_ref_custom_id") or row.get("product_ref_id"),
                    "product_name": row.get("product_ref_name") or "—",
                    "product_type": self._product_type_label(row.get("product_ref_type")),
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
        queued = queue_export_if_requested(
            request,
            export_key="pharmacy_least_requested_products_pdf",
            payload=payload,
            content_disposition="inline",
        )
        if queued is not None:
            return queued

        from tasks.generate_pdf.pharmacy_reports_pdf_generator import generate_pharmacy_least_requested_products_pdf

        pdf_bytes, filename = generate_pharmacy_least_requested_products_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"], url_path="request-sectors/pdf", url_name="request-sectors-pdf")
    def product_sector_demand_pdf(self, request):
        """PDF com os setores que mais requisitaram um produto específico."""
        user = getattr(request, "user", None)
        if not _is_pharmacy_user(user):
            raise ValidationError("Apenas Farmácia pode emitir relatório de setores por produto.")

        raw_product_id = request.query_params.get("product_id") or request.query_params.get("produto")
        product_name = (
            request.query_params.get("product_name") or request.query_params.get("nome_produto") or ""
        ).strip()

        if raw_product_id not in (None, ""):
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
        elif product_name:
            product = (
                self.get_queryset()
                .filter(deleted=False, name__icontains=product_name)
                .order_by("name", "id")
                .first()
            )
            if not product:
                raise ValidationError({"product_name": "Nenhum produto encontrado com esse nome."})
            product_id = product.pk
        else:
            raise ValidationError({"product_id": "Informe o ID ou o nome do produto."})

        qs, date_from, date_to = self._base_requisition_items(request)
        qs = qs.filter(product_ref_id=product_id)

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
        queued = queue_export_if_requested(
            request,
            export_key="pharmacy_product_sector_demand_pdf",
            payload=payload,
            content_disposition="inline",
        )
        if queued is not None:
            return queued

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

    @staticmethod
    def _invoice_payload(invoice: Invoice) -> dict:
        return {
            "id": invoice.id,
            "custom_id": invoice.custom_id,
            "status": invoice.status,
            "origin": invoice.origin,
            "total": str(invoice.total or "0.00"),
            "patient_amount": str(invoice.patient_amount or "0.00"),
        }

    @staticmethod
    def _receipt_payload(receipt) -> dict:
        return {
            "id": receipt.id,
            "number": receipt.number,
            "value": str(receipt.value or "0.00"),
            "invoice": receipt.invoice_id,
            "payment": receipt.payment_id,
            "created_at": receipt.created_at,
        }

    def _sale_invoice(self, sale: Sale) -> Invoice | None:
        return Invoice.objects.filter(sale=sale, deleted=False).order_by("-created_at", "-id").first()

    @action(detail=True, methods=["post"], url_path="generate-invoice", url_name="generate-invoice")
    def generate_invoice(self, request, pk=None):
        sale = self.get_object()
        if not sale.itens.filter(deleted=False).exists():
            raise ValidationError({"items": "A venda precisa ter pelo menos um item para gerar fatura."})

        invoice = self._sale_invoice(sale)
        if invoice is not None:
            if invoice.status == Invoice.Status.CANCELED:
                raise ValidationError({"invoice": "A fatura desta venda foi cancelada. Regularize a fatura antes de gerar PDF."})
            if invoice.status == Invoice.Status.DRAFT:
                try:
                    with transaction.atomic():
                        invoice.sync_items_from_origin()
                        invoice.issue()
                        invoice.refresh_from_db()
                except Exception as exc:
                    raise ValidationError(str(exc)) from exc
            return Response(self._invoice_payload(invoice))

        tenant = sale.tenant or getattr(request, "tenant", None)
        try:
            with transaction.atomic():
                invoice = Invoice(
                    tenant=tenant,
                    origin=Invoice.Origin.PHARMACY,
                    sale=sale,
                    patient=sale.patient,
                    status=Invoice.Status.DRAFT,
                )
                invoice.full_clean()
                invoice.save()
                invoice.sync_items_from_origin()
                invoice.issue()
                invoice.refresh_from_db()
        except Exception as exc:
            raise ValidationError(str(exc)) from exc

        return Response(self._invoice_payload(invoice), status=201)

    @action(detail=True, methods=["get"], url_path="billing-status", url_name="billing-status")
    def billing_status(self, request, pk=None):
        sale = self.get_object()
        invoice = self._sale_invoice(sale)
        receipt = None
        if invoice is not None:
            receipt = invoice.recibos.order_by("-created_at", "-id").first()

        return Response(
            {
                "invoice": self._invoice_payload(invoice) if invoice is not None else None,
                "receipt": self._receipt_payload(receipt) if receipt is not None else None,
                "paid": bool(invoice and invoice.status == Invoice.Status.PAID),
            }
        )

    @action(detail=True, methods=["post"], url_path="generate-receipt", url_name="generate-receipt")
    def generate_receipt(self, request, pk=None):
        sale = self.get_object()
        invoice = self._sale_invoice(sale)
        if invoice is None:
            raise ValidationError({"invoice": "Gere a fatura da venda antes de gerar recibo."})

        receipt = invoice.recibos.order_by("-created_at", "-id").first()
        if receipt is not None:
            return Response(self._receipt_payload(receipt))

        payment = invoice.pagamentos.filter(status="CON", deleted=False).order_by("-paid_at", "-created_at", "-id").first()
        if payment is not None:
            invoice.update_payment_status(payment=payment)
            invoice.refresh_from_db()
            receipt = invoice.recibos.order_by("-created_at", "-id").first()
            if receipt is not None:
                return Response(self._receipt_payload(receipt))

        raise ValidationError({"receipt": "Recibo só pode ser gerado depois de pagamento confirmado da fatura."})


class ParentCategoryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ParentCategory.objects.all()
    serializer_class = ParentCategorySerializer
    filterset_class = ParentCategoryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "description"]
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
        "version",
    ]
    ordering = ["name"]


class ProductCategoryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ProductCategory.objects.select_related("parent_category").all()
    serializer_class = ProductCategorySerializer
    filterset_class = ProductCategoryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "description", "parent_category__name"]
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
        "parent_category",
        "version",
    ]
    ordering = ["name"]


VIEWSET_MAP = {
    "sale_item": SaleItemViewSet,
    "lot": LotViewSet,
    "inventory_movement": InventoryMovementViewSet,
    "product": ProductViewSet,
    "material_requisition": None,
    "material_requisition_item": None,
    "sale": SaleViewSet,
    "parent-categories": ParentCategoryViewSet,
    "product-categories": ProductCategoryViewSet,
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


def _is_admin_user(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    groups = _user_groups(user)
    return _normalize(RBAC_GROUPS["ADMIN"]) in groups


# Mapa grupo RBAC → setor solicitante. Ordem = precedência para utilizadores
# com múltiplos perfis (farmácia primeiro: é quem se abastece no armazém).
_GROUP_SECTOR_MAP: tuple[tuple[str, str], ...] = (
    ("FARMACIA", RequestingSector.FARMACIA),
    ("FARMACIA_CLINICA", RequestingSector.FARMACIA_CLINICA),
    ("LABORATORIO", RequestingSector.LABORATORIO),
    ("ENFERMAGEM", RequestingSector.ENFERMAGEM),
    ("RECEPCAO", RequestingSector.RECEPCAO),
    ("MEDICINA", RequestingSector.MEDICINA),
    ("MEDICINA_OCUPACIONAL", RequestingSector.MEDICINA_OCUPACIONAL),
    ("ODONTOLOGIA", RequestingSector.ODONTOLOGIA),
    ("VETERINARIA", RequestingSector.VETERINARIA),
    ("FISIOTERAPIA", RequestingSector.FISIOTERAPIA),
    ("RADIOLOGIA", RequestingSector.RADIOLOGIA),
    ("CARDIOLOGIA", RequestingSector.CARDIOLOGIA),
    ("NEUROLOGIA", RequestingSector.NEUROLOGIA),
    ("OFTALMOLOGIA", RequestingSector.OFTALMOLOGIA),
    ("TERAPIA_OCUPACIONAL", RequestingSector.TERAPIA_OCUPACIONAL),
    ("FONOAUDIOLOGIA", RequestingSector.FONOAUDIOLOGIA),
    ("TELEMEDICINA", RequestingSector.TELEMEDICINA),
    ("SAUDE_PUBLICA", RequestingSector.SAUDE_PUBLICA),
    ("CREDITO_FINANCIAMENTO", RequestingSector.CREDITO_FINANCIAMENTO),
    ("LOGISTICA", RequestingSector.LOGISTICA),
    ("MANUTENCAO", RequestingSector.MANUTENCAO),
    ("CONTABILIDADE", RequestingSector.CONTABILIDADE),
    ("RECURSOS_HUMANOS", RequestingSector.RECURSOS_HUMANOS),
    ("PROFESSOR", RequestingSector.EDUCACAO),
    ("DIRETOR_ESCOLA", RequestingSector.EDUCACAO),
    ("DIRETOR_ADJUNTO_PEDAGOGICO", RequestingSector.EDUCACAO),
    ("TEACHER", RequestingSector.EDUCACAO),
)


def _requester_sectors_from_user(user) -> set[str]:
    groups = _user_groups(user)
    return {
        sector
        for group_key, sector in _GROUP_SECTOR_MAP
        if _normalize(RBAC_GROUPS[group_key]) in groups
    }


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
    for _group_key, sector in _GROUP_SECTOR_MAP:
        if sector in sectors:
            return sector
    if _has_non_pharmacy_group(user):
        return RequestingSector.OUTROS
    return None


def _issue_warehouse_stock(item, qty: int, *, reference_document: str) -> None:
    """
    Baixa `qty` unidades do item de armazém em modo FEFO, criando movimentos WMS
    de saída (que ajustam o StockLevel automaticamente ao serem lançados).
    """
    from apps.warehouse.models import StockLevel, StockMovement

    remaining = Decimal(qty)
    levels = (
        StockLevel.objects.select_for_update()
        .filter(tenant_id=item.tenant_id, item_id=item.warehouse_item_id, quantity__gt=0)
        .select_related("lot", "location")
        .order_by(F("lot__expiration_date").asc(nulls_last=True), "id")
    )
    for level in levels:
        if remaining <= 0:
            break
        available = StockLevel.available_quantity_for(
            tenant=item.tenant,
            item=item.warehouse_item,
            location=level.location,
            lot=level.lot,
        )
        take = min(remaining, Decimal(available))
        if take <= 0:
            continue

        StockMovement.objects.create(
            tenant=item.tenant,
            item=item.warehouse_item,
            lot=level.lot,
            source_location=level.location,
            movement_type=StockMovement.MovementType.ISSUE,
            quantity=take,
            reference_document=reference_document,
            reason="Requisição de materiais (farmácia)",
        )
        remaining -= take

    if remaining > 0:
        raise ValidationError(
            {
                "quantity": (
                    f"Estoque de armazém insuficiente para o item {item.id}; "
                    f"faltam {remaining} unidade(s)."
                )
            }
        )


def _issue_pharmacy_product_stock(item, qty: int) -> None:
    """
    Baixa `qty` unidades do produto da farmácia em modo FEFO, criando movimentos
    de saída (origem REQ) nos lotes com saldo até cobrir a quantidade.
    """
    remaining = int(qty)
    lots = Lot.available(item.product).filter(tenant_id=item.tenant_id)
    for lot in lots:
        if remaining <= 0:
            break
        balance = int(lot.saldo if lot.saldo is not None else lot.balance())
        take = min(remaining, balance)
        if take <= 0:
            continue

        InventoryMovement.objects.create(
            tenant=item.tenant,
            lot=lot,
            type="SAI",
            origin="REQ",
            quantity=take,
            material_request_item=item,
        )
        remaining -= take

    if remaining > 0:
        raise ValidationError(
            {
                "quantity": (
                    f"Estoque da farmácia insuficiente para o item {item.id}; "
                    f"faltam {remaining} unidade(s)."
                )
            }
        )


def _requesting_department_from_user(user) -> str:
    try:
        return getattr(getattr(user, "perfil_professional", None), "department", "") or ""
    except Exception:
        return ""


class MaterialRequisitionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MaterialRequisition.objects.prefetch_related(
        "items", "items__lot", "items__lot__product", "items__product", "items__warehouse_item"
    ).select_related(
        "created_by",
        "fulfilled_by",
        "on_hold_by",
    )
    serializer_class = MaterialRequisitionSerializer
    filterset_class = MaterialRequisitionFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        # Requisição
        "custom_id",
        # Produto/medicamento nos itens (cobre busca por material, medicamento)
        "items__product__name",
        # Referência da fatura / departamento (cobre busca por procedimento via fatura)
        "requested_by_department",
        # Solicitante / usuário criador
        "created_by__username",
        "created_by__first_name",
        "created_by__last_name",
        # Usuário que aviou
        "fulfilled_by__username",
        "fulfilled_by__first_name",
        "fulfilled_by__last_name",
        # Usuário que arquivou
        "on_hold_by__username",
        "on_hold_by__first_name",
        "on_hold_by__last_name",
    ]
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

    @action(detail=False, methods=["get"], url_path="requester-context", url_name="requester-context")
    def requester_context(self, request):
        user = getattr(request, "user", None)
        is_admin = _is_admin_user(user)

        inferred_sector = _infer_sector_from_user(user)
        requester_sector = inferred_sector
        if is_admin and not requester_sector:
            requester_sector = RequestingSector.OUTROS

        sector_labels = dict(RequestingSector.choices)
        requester_sector_label = sector_labels.get(requester_sector, requester_sector or "")
        requested_by_department = _requesting_department_from_user(user)
        source_labels = dict(RequisitionSource.choices)

        def sector_option(code: str, label: str) -> dict:
            source = source_for_sector(code)
            return {
                "value": code,
                "label": label,
                "source": source,
                "source_label": source_labels.get(source, source),
            }

        if is_admin:
            available_sectors = [sector_option(code, label) for code, label in RequestingSector.choices]
        elif requester_sector:
            available_sectors = [sector_option(requester_sector, requester_sector_label)]
        else:
            available_sectors = []

        requester_source = source_for_sector(requester_sector) if requester_sector else None

        return Response(
            {
                "is_admin": is_admin,
                "can_create": bool(requester_sector),
                "sector_locked": not is_admin,
                "requester_sector": requester_sector,
                "requester_sector_label": requester_sector_label,
                "requester_source": requester_source,
                "requester_source_label": source_labels.get(requester_source, "") if requester_source else "",
                "requested_by_department": requested_by_department,
                "available_sectors": available_sectors,
            }
        )

    @action(detail=False, methods=["get"], url_path="warehouse-stock", url_name="warehouse-stock")
    def warehouse_stock(self, request):
        """
        Estoque disponível no armazém central, agregado por item (físico - reservado).
        Usado pela farmácia para requisitar insumos ao armazém.
        """
        from apps.warehouse.models import ReservationStatus, StockLevel, StockReservation

        user = getattr(request, "user", None)
        if not _is_pharmacy_user(user):
            raise ValidationError("Apenas Farmácia pode consultar o estoque do armazém para requisição.")

        tenant = getattr(request, "tenant", None)
        physical_qs = StockLevel.objects.filter(deleted=False, quantity__gt=0)
        reserved_qs = StockReservation.objects.filter(deleted=False, status=ReservationStatus.ACTIVE)
        if tenant is not None:
            physical_qs = physical_qs.filter(tenant=tenant)
            reserved_qs = reserved_qs.filter(tenant=tenant)

        search = (request.query_params.get("search") or "").strip()
        if search:
            physical_qs = physical_qs.filter(Q(item__name__icontains=search) | Q(item__sku__icontains=search))

        physical = physical_qs.values(
            "item",
            "item__sku",
            "item__name",
            "item__unit_of_measure",
        ).annotate(total=Sum("quantity"))

        reserved_by_item = {
            row["item"]: row["total"] or 0
            for row in reserved_qs.values("item").annotate(total=Sum("quantity"))
        }

        rows = []
        for row in physical:
            available = Decimal(row["total"] or 0) - Decimal(reserved_by_item.get(row["item"], 0))
            if available <= 0:
                continue
            rows.append(
                {
                    "id": row["item"],
                    "sku": row["item__sku"],
                    "name": row["item__name"],
                    "unit_of_measure": row["item__unit_of_measure"],
                    "available": float(available),
                }
            )

        rows.sort(key=lambda r: (r["name"] or "").lower())
        return Response(rows)

    def perform_create(self, serializer):
        user = getattr(self.request, "user", None)
        is_admin = _is_admin_user(user)
        requested_sector = serializer.validated_data.get("sector")

        sector = _infer_sector_from_user(user)
        if is_admin:
            if requested_sector:
                sector = requested_sector
            elif not sector:
                sector = RequestingSector.OUTROS
        else:
            if not sector:
                raise ValidationError(
                    "Este perfil não pode criar requisição de material. "
                    "A criação deve ser feita por setores solicitantes."
                )
            if requested_sector and requested_sector != sector:
                raise ValidationError({"sector": "Setor solicitante inválido para o utilizador atual."})

        department = _requesting_department_from_user(user)
        source = source_for_sector(sector)

        items_input = serializer.validated_data.get("items_input") or []
        for idx, item in enumerate(items_input):
            has_pharmacy_target = bool(item.get("lot")) or bool(item.get("product"))
            has_warehouse_item = bool(item.get("warehouse_item"))
            if source == RequisitionSource.WAREHOUSE and not has_warehouse_item:
                raise ValidationError(
                    {"items_input": f"Item {idx + 1}: requisições da farmácia ao armazém usam itens de armazém."}
                )
            if source == RequisitionSource.PHARMACY and not has_pharmacy_target:
                raise ValidationError(
                    {
                        "items_input": (
                            f"Item {idx + 1}: requisições à farmácia usam produtos ou lotes "
                            "do estoque da farmácia."
                        )
                    }
                )

        serializer.save(
            sector=sector,
            source=source,
            requested_by_department=department,
            status=MaterialRequisitionStatus.PENDING,
        )

    @action(detail=True, methods=["post"], url_path="fulfill", url_name="fulfill")
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
            for item in requisition.items.select_related("lot", "product", "warehouse_item").all():
                it = by_id.get(item.id)
                if not it:
                    continue

                remaining = max(0, int(item.requested_quantity) - int(item.supplied_quantity or 0))
                if remaining <= 0:
                    continue

                qty_raw = it.get("quantity", remaining)
                try:
                    qty = int(qty_raw)
                except Exception as err:
                    raise ValidationError({"quantity": f"Quantidade inválida para item {item.id}."}) from err

                if qty <= 0:
                    continue

                if qty > remaining:
                    raise ValidationError({"quantity": f"Quantidade maior que o solicitado (item {item.id})."})

                available = item.available_quantity
                if qty > available:
                    raise ValidationError(
                        {
                            "quantity": (
                                f"Não é possível aviar {qty} unidade(s) do item {item.id}; "
                                f"estoque disponível: {available}."
                            )
                        }
                    )

                if item.lot_id:
                    InventoryMovement.objects.create(
                        tenant=item.tenant,
                        lot=item.lot,
                        type="SAI",
                        origin="REQ",
                        quantity=qty,
                        material_request_item=item,
                    )
                elif item.product_id:
                    _issue_pharmacy_product_stock(item, qty)
                else:
                    _issue_warehouse_stock(
                        item,
                        qty,
                        reference_document=requisition.custom_id or f"REQFAR-{requisition.id}",
                    )

                item.supplied_quantity = int(item.supplied_quantity or 0) + qty
                item.save(update_fields=["supplied_quantity", "updated_at", "updated_by"])

            requisition.refresh_from_db()
            items = list(requisition.items.all())
            any_supplied = any((i.supplied_quantity or 0) > 0 for i in items)
            all_supplied = (
                all((i.supplied_quantity or 0) >= (i.requested_quantity or 0) for i in items) if items else False
            )

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

    @action(detail=True, methods=["post"], url_path="archive", url_name="archive")
    def archive(self, request, pk=None):
        user = getattr(request, "user", None)
        if not _is_pharmacy_user(user):
            raise ValidationError("Apenas Farmácia pode arquivar requisições.")

        requisition: MaterialRequisition = self.get_object()
        reason = request.data.get("reason") or request.data.get("motivo") or None

        requisition.status = MaterialRequisitionStatus.ON_HOLD
        requisition.hold_reason = reason
        requisition.on_hold_at = timezone.now()
        requisition.on_hold_by = user
        requisition.save(
            update_fields=["status", "hold_reason", "on_hold_at", "on_hold_by", "updated_at", "updated_by"]
        )

        return Response(self.get_serializer(requisition).data)

    @action(detail=True, methods=["post"], url_path="skip-item", url_name="skip-item")
    def skip_item(self, request, pk=None):
        """Remove (soft-delete) um item da requisição e recalcula o estado da requisição.

        Payload: { item_id: <int>, reason: <str|null> }
        """
        user = getattr(request, "user", None)
        if not _is_pharmacy_user(user):
            raise ValidationError("Apenas Farmácia pode arquivar itens.")

        requisition: MaterialRequisition = self.get_object()
        if requisition.status == MaterialRequisitionStatus.FULFILLED:
            raise ValidationError("Requisição já aviada; não é possível remover itens.")

        item_id_raw = request.data.get("item_id")
        try:
            item_id = int(item_id_raw)
        except Exception as exc:
            raise ValidationError({"item_id": "item_id inválido."}) from exc

        reason = request.data.get("reason") or request.data.get("motivo") or None

        with transaction.atomic():
            try:
                item = requisition.items.get(pk=item_id, deleted=False)
            except MaterialRequisitionItem.DoesNotExist:
                raise ValidationError({"item_id": "Item não encontrado nesta requisição."})

            # Soft-delete: marca como removido; notes regista motivo.
            item.deleted = True
            from django.utils import timezone as tz
            item.deleted_at = tz.now()
            item.deleted_by = user
            if reason:
                item.notes = reason
            item.save(update_fields=["deleted", "deleted_at", "deleted_by", "notes", "updated_at", "updated_by"])

            # Recalcula estado da requisição com base nos itens restantes.
            remaining_items = list(requisition.items.filter(deleted=False))
            if not remaining_items:
                # Sem itens: arquiva a requisição automaticamente.
                requisition.status = MaterialRequisitionStatus.ON_HOLD
                requisition.hold_reason = reason or "Todos os itens removidos."
                requisition.on_hold_at = tz.now()
                requisition.on_hold_by = user
                requisition.save(update_fields=["status", "hold_reason", "on_hold_at", "on_hold_by", "updated_at", "updated_by"])
            else:
                any_supplied = any((i.supplied_quantity or 0) > 0 for i in remaining_items)
                all_supplied = all(
                    (i.supplied_quantity or 0) >= (i.requested_quantity or 0) for i in remaining_items
                )
                if all_supplied:
                    requisition.status = MaterialRequisitionStatus.FULFILLED
                    requisition.fulfilled_at = tz.now()
                    requisition.fulfilled_by = user
                    requisition.save(update_fields=["status", "fulfilled_at", "fulfilled_by", "updated_at", "updated_by"])
                elif any_supplied:
                    requisition.status = MaterialRequisitionStatus.PARTIAL
                    requisition.save(update_fields=["status", "updated_at", "updated_by"])
                else:
                    if requisition.status != MaterialRequisitionStatus.PENDING:
                        requisition.status = MaterialRequisitionStatus.PENDING
                        requisition.save(update_fields=["status", "updated_at", "updated_by"])

        requisition.refresh_from_db()
        return Response(self.get_serializer(requisition).data)

    @action(detail=False, methods=["get"], url_path="movement-history/pdf", url_name="movement-history-pdf")
    def movement_history_pdf(self, request):
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
        queued = queue_export_if_requested(
            request,
            export_key="pharmacy_sector_movements_pdf",
            payload=payload,
            content_disposition="inline",
        )
        if queued is not None:
            return queued

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
        "position",
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
    ordering = ["requisition", "position", "id"]

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


VIEWSET_MAP["material_requisition"] = MaterialRequisitionViewSet
VIEWSET_MAP["material_requisition_item"] = MaterialRequisitionItemViewSet

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
