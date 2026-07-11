from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated  # Protege endpoints
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet  # CRUD base DRF

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.maternity.models.pregnancy import Pregnancy

from ..filters import PregnancyFilter
from ..serializers import PregnancySerializer


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


class PregnancyViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Pregnancy.objects.select_related(
        "patient", "responsible_doctor", "nursery", "maternity_bed"
    ).all()
    serializer_class = PregnancySerializer
    filterset_class = PregnancyFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "responsible_doctor__name",
        "responsible_doctor__document_number",
        "nursery__name",
        "maternity_bed__number",
        "notes",
    ]
    ordering_fields = [
        "created_at",
        "updated_at",
        "status",
        "expected_delivery_date",
        "last_menstrual_period_date",
        "total_deliveries",
        "normal_deliveries",
        "cesareans",
    ]
    ordering = ["-created_at", "-id"]

    @action(detail=True, methods=["post"], url_path="registar-parto", url_name="registar-parto")
    def registar_parto(self, request, pk=None):
        pregnancy = self.get_object()
        try:
            pregnancy.register_delivery(cesarean=bool(request.data.get("cesarean", False)))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(pregnancy).data)

    @action(detail=True, methods=["post"], url_path="encerrar", url_name="encerrar")
    def encerrar(self, request, pk=None):
        pregnancy = self.get_object()
        try:
            pregnancy.close()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(pregnancy).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        pregnancy = self.get_object()
        try:
            pregnancy.cancel(reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(pregnancy).data)


VIEWSET_MAP = {
    "gestacao": PregnancyViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "PregnancyViewSet",
]

