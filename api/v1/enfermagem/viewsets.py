from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.enfermagem.modelos import (
    Procedimento,
    ProcedimentoItem,
    RegistroEnfermagem,
    SinalVitalEnfermagem,
)
from .filters import (
    ProcedimentoFilter,
    ProcedimentoItemFilter,
    RegistroEnfermagemFilter,
    SinalVitalEnfermagemFilter,
)
from .serializers import (
    ProcedimentoItemSerializer,
    ProcedimentoSerializer,
    RegistroEnfermagemSerializer,
    SinalVitalEnfermagemSerializer,
)


class RegistroEnfermagemViewSet(ModelViewSet):
    queryset = RegistroEnfermagem.objects.all()
    serializer_class = RegistroEnfermagemSerializer
    filterset_class = RegistroEnfermagemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "nome",
        "paciente__nome",
        "observacao",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "nome",
        "paciente",
        "prioridade",
        "data_registro",
        "criado_em",
        "atualizado_em",
        "deletado",
    ]
    ordering = ["-data_registro", "-criado_em"]

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset


class ProcedimentoViewSet(ModelViewSet):
    queryset = Procedimento.objects.all()
    serializer_class = ProcedimentoSerializer
    filterset_class = ProcedimentoFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "paciente__nome",
        "observacoes",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "paciente",
        "profissional",
        "data_realizacao",
        "criado_em",
        "atualizado_em",
        "deletado",
    ]
    ordering = ["-data_realizacao", "-criado_em"]

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset


class ProcedimentoItemViewSet(ModelViewSet):
    queryset = ProcedimentoItem.objects.all()
    serializer_class = ProcedimentoItemSerializer
    filterset_class = ProcedimentoItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "descricao",
        "procedimento__id_custom",
        "procedimento__paciente__nome",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "procedimento",
        "descricao",
        "quantidade",
        "realizado",
        "criado_em",
        "atualizado_em",
        "deletado",
    ]
    ordering = ["-criado_em"]

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset


class SinalVitalEnfermagemViewSet(ModelViewSet):
    queryset = SinalVitalEnfermagem.objects.all()
    serializer_class = SinalVitalEnfermagemSerializer
    filterset_class = SinalVitalEnfermagemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "nome",
        "registro__paciente__nome",
        "pressao_arterial",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "nome",
        "registro",
        "temperatura_c",
        "frequencia_cardiaca",
        "frequencia_respiratoria",
        "saturacao_oxigenio",
        "coletado_em",
        "criado_em",
        "atualizado_em",
        "deletado",
    ]
    ordering = ["-coletado_em", "-criado_em"]

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset


VIEWSET_MAP = {
    "procedimento": ProcedimentoViewSet,
    "procedimentoitem": ProcedimentoItemViewSet,
    "registroenfermagem": RegistroEnfermagemViewSet,
    "sinalvitalenfermagem": SinalVitalEnfermagemViewSet,
}


__all__ = [
    "ProcedimentoViewSet",
    "ProcedimentoItemViewSet",
    "RegistroEnfermagemViewSet",
    "SinalVitalEnfermagemViewSet",
    "VIEWSET_MAP",
]
