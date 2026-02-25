from rest_framework import viewsets

from frontend.api.serializers.resultado import ResultadoItemSerializer as ris
from frontend.api.views.permissions import IsAdmin, IsLabTechnician, IsNurse
from frontend.billing.models.resultado_analise import ResultadoAnaliseItem as ri

from .config import ConfigChoicesView
from .export import ExportRequisicoesCSV


class ResultadoItemViewSet(
    viewsets.ModelViewSet,
    ExportRequisicoesCSV,
    ConfigChoicesView,
):
    queryset = ri.objects.select_related(
        "requisicao",
        "exame_campo",
        "validado_por",
    ).all()

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return ris
        if self.action in ["update", "partial_update"]:
            return ris
        return ris

    def get_permissions(self):
        if self.action in ["update", "partial_update"]:
            return [IsAdmin() | IsLabTechnician()]
        if self.action in ["list", "retrieve"]:
            return [IsAdmin() | IsLabTechnician() | IsNurse()]
        return [IsAdmin()]
