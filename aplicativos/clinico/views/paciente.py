from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated as autenticado
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from frontend.api.serializers.paciente import (
    PacienteReadSerializer,
    PacienteWriteSerializer,
)
from frontend.billing.models.paciente import Paciente

from ..viewsets.docs import APIDocsView
from .config import ConfigChoicesView
from .export import ExportPacientesCSV


class PacienteViewSet(ModelViewSet, ExportPacientesCSV, ConfigChoicesView, APIDocsView):
    """
    ViewSet responsável por todas as operações do paciente.

    Regras:
    - LIST e RETRIEVE usam serializer de leitura
    - CREATE e UPDATE usam serializer de escrita
    - Endpoint extra para retornar choices do model
    """

    queryset = Paciente.objects.all()
    permission_classes = [autenticado]

    # serializer padrão (fallback)
    serializer_class = PacienteReadSerializer

    def get_serializer_class(self):
        """
        Define qual serializer usar dependendo da ação.
        """

        if self.action in ["create", "update", "partial_update"]:
            return PacienteWriteSerializer

        return PacienteReadSerializer

    # -------------------------
    # ENDPOINT DE CHOICES
    # -------------------------
    @action(detail=False, methods=["get"])
    def choices(self, request):
        """
        Retorna os choices do model Paciente
        para serem consumidos dinamicamente pelo frontend.
        """

        return Response(
            {
                "genero": Paciente._meta.get_field("genero").choices,
                "raca_origem": Paciente._meta.get_field("raca_origem").choices,
                "tipo_documento": Paciente._meta.get_field("tipo_documento").choices,
                "proveniencia": Paciente._meta.get_field("proveniencia").choices,
            }
        )
