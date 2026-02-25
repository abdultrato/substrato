from backend.frontend.api.views.permissions import (
    IsAdmin,
    IsAdminTech,
    IsAuthenticated,
    IsRecepcionista,
)
from frontend.api.serializers.fatura import FaturaSerializer
from frontend.api.viewsets.base_viewset import BaseModelViewSet
from frontend.billing.models.fatura import Fatura

from ..viewsets.docs import APIDocsView
from ..viewsets.files import FileDownloadMixin
from ..viewsets.metrics_api import MetricsMixin
from .config import ConfigChoicesView
from .export import ExportPacientesCSV


class FaturaViewSet(
    BaseModelViewSet,
    ExportPacientesCSV,
    ConfigChoicesView,
    APIDocsView,
    FileDownloadMixin,
    MetricsMixin,
):
    queryset = Fatura.objects.prefetch_related("itens").all()

    def get_serializer_class(self):
        if self.action == "list":
            return FaturaSerializer
        return FaturaSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdmin()]
        if self.action in ["retrieve", "list"]:
            return [IsAdmin() | IsRecepcionista() | IsAdminTech()]
        return [IsAuthenticated()]
