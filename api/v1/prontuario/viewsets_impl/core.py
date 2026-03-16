from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.prontuario.modelos.prescricao_item import PrescricaoItem
from aplicativos.prontuario.modelos.registro_prontuario import RegistroProntuario

from ..filters import PrescricaoItemFilter, RegistroProntuarioFilter
from ..serializers import PrescricaoItemSerializer, RegistroProntuarioSerializer


class RegistroProntuarioViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = RegistroProntuario.objects.select_related("paciente", "medico").prefetch_related("consultas").all()
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


class PrescricaoItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PrescricaoItem.objects.select_related("registro", "medicacao").all()
    serializer_class = PrescricaoItemSerializer
    filterset_class = PrescricaoItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "medicacao__nome", "observacoes"]
    ordering_fields = ["criado_em", "dosagem_valor", "numero_doses"]
    ordering = ["-criado_em"]


VIEWSET_MAP = {
    "registro": RegistroProntuarioViewSet,
    "prescricaoitem": PrescricaoItemViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "PrescricaoItemViewSet",
    "RegistroProntuarioViewSet",
]
