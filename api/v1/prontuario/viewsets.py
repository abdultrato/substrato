from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.prontuario.modelos.registro_prontuario import RegistroProntuario
from aplicativos.prontuario.modelos.prescricao_item import PrescricaoItem

from .filters import RegistroProntuarioFilter, PrescricaoItemFilter
from .serializers import RegistroProntuarioSerializer, PrescricaoItemSerializer


class RegistroProntuarioViewSet(ModelViewSet):
    queryset = RegistroProntuario.objects.select_related(
        "paciente", "medico"
    ).prefetch_related("consultas").all()
    serializer_class = RegistroProntuarioSerializer
    filterset_class = RegistroProntuarioFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "paciente__nome",
        "medico__username",
        "diagnostico",
        "sintomas",
    ]
    ordering_fields = ["inicio_atendimento", "fim_atendimento", "criado_em", "estado"]
    ordering = ["-inicio_atendimento", "-criado_em"]

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)
        return qs


class PrescricaoItemViewSet(ModelViewSet):
    queryset = PrescricaoItem.objects.select_related("registro", "medicacao").all()
    serializer_class = PrescricaoItemSerializer
    filterset_class = PrescricaoItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "medicacao__nome", "observacoes"]
    ordering_fields = ["criado_em", "dosagem_valor", "numero_doses"]
    ordering = ["-criado_em"]

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)
        return qs


VIEWSET_MAP = {
    "registro": RegistroProntuarioViewSet,
    "prescricaoitem": PrescricaoItemViewSet,
}

__all__ = [
    "RegistroProntuarioViewSet",
    "PrescricaoItemViewSet",
    "VIEWSET_MAP",
]
