from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.enfermagem.modelos import (
    EvolucaoEnfermagem,
    PrescricaoEnfermagem,
    ProcedimentoCatalogo,
    ProcedimentoCatalogoMaterial,
    Procedimento,
    ProcedimentoItem,
    ProcedimentoItemValor,
    ProcedimentoMaterial,
    ProcedimentoMaterialValor,
    RegistroEnfermagem,
    SinalVitalEnfermagem,
)
from .filters import (
    EvolucaoEnfermagemFilter,
    PrescricaoEnfermagemFilter,
    ProcedimentoCatalogoFilter,
    ProcedimentoCatalogoMaterialFilter,
    ProcedimentoFilter,
    ProcedimentoItemFilter,
    ProcedimentoItemValorFilter,
    ProcedimentoMaterialFilter,
    ProcedimentoMaterialValorFilter,
    RegistroEnfermagemFilter,
    SinalVitalEnfermagemFilter,
)
from .serializers import (
    EvolucaoEnfermagemSerializer,
    PrescricaoEnfermagemSerializer,
    ProcedimentoCatalogoMaterialSerializer,
    ProcedimentoCatalogoSerializer,
    ProcedimentoItemSerializer,
    ProcedimentoItemValorSerializer,
    ProcedimentoMaterialSerializer,
    ProcedimentoMaterialValorSerializer,
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


class ProcedimentoCatalogoViewSet(ModelViewSet):
    queryset = ProcedimentoCatalogo.objects.all()
    serializer_class = ProcedimentoCatalogoSerializer
    filterset_class = ProcedimentoCatalogoFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "nome",
        "descricao",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "nome",
        "preco_padrao",
        "criado_em",
        "atualizado_em",
        "deletado",
    ]
    ordering = ["nome", "-criado_em"]

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset


class ProcedimentoCatalogoMaterialViewSet(ModelViewSet):
    queryset = ProcedimentoCatalogoMaterial.objects.all()
    serializer_class = ProcedimentoCatalogoMaterialSerializer
    filterset_class = ProcedimentoCatalogoMaterialFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "catalogo__nome",
        "produto__nome",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "catalogo",
        "produto",
        "quantidade_padrao",
        "custo_unitario_padrao",
        "criado_em",
        "atualizado_em",
        "deletado",
    ]
    ordering = ["catalogo", "produto", "-criado_em"]

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
        "subtotal_servicos",
        "subtotal_materiais",
        "total",
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
        "catalogo__nome",
        "procedimento__id_custom",
        "procedimento__paciente__nome",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "procedimento",
        "catalogo",
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


class ProcedimentoItemValorViewSet(ModelViewSet):
    queryset = ProcedimentoItemValor.objects.all()
    serializer_class = ProcedimentoItemValorSerializer
    filterset_class = ProcedimentoItemValorFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "item__id_custom",
        "item__descricao",
        "item__procedimento__id_custom",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "item",
        "preco_unitario",
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


class ProcedimentoMaterialViewSet(ModelViewSet):
    queryset = ProcedimentoMaterial.objects.all()
    serializer_class = ProcedimentoMaterialSerializer
    filterset_class = ProcedimentoMaterialFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "produto__nome",
        "lote__numero_lote",
        "procedimento__id_custom",
        "procedimento__paciente__nome",
        "procedimento_item__id_custom",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "procedimento",
        "procedimento_item",
        "produto",
        "lote",
        "quantidade",
        "movimento_estoque",
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


class ProcedimentoMaterialValorViewSet(ModelViewSet):
    queryset = ProcedimentoMaterialValor.objects.all()
    serializer_class = ProcedimentoMaterialValorSerializer
    filterset_class = ProcedimentoMaterialValorFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "material__id_custom",
        "material__produto__nome",
        "material__procedimento__id_custom",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "material",
        "custo_unitario",
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


class PrescricaoEnfermagemViewSet(ModelViewSet):
    queryset = PrescricaoEnfermagem.objects.all()
    serializer_class = PrescricaoEnfermagemSerializer
    filterset_class = PrescricaoEnfermagemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "nome",
        "paciente__nome",
        "descricao",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "nome",
        "paciente",
        "ativo",
        "data_prescricao",
        "criado_em",
        "atualizado_em",
        "deletado",
    ]
    ordering = ["-data_prescricao", "-criado_em"]

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset


class EvolucaoEnfermagemViewSet(ModelViewSet):
    queryset = EvolucaoEnfermagem.objects.all()
    serializer_class = EvolucaoEnfermagemSerializer
    filterset_class = EvolucaoEnfermagemFilter
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
        "data_evolucao",
        "criado_em",
        "atualizado_em",
        "deletado",
    ]
    ordering = ["-data_evolucao", "-criado_em"]

    def get_queryset(self):
        queryset = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            queryset = queryset.filter(inquilino=inquilino)
        return queryset


VIEWSET_MAP = {
    "evolucaoenfermagem": EvolucaoEnfermagemViewSet,
    "procedimentocatalogo": ProcedimentoCatalogoViewSet,
    "procedimentocatalogomaterial": ProcedimentoCatalogoMaterialViewSet,
    "procedimento": ProcedimentoViewSet,
    "procedimentoitem": ProcedimentoItemViewSet,
    "procedimentoitemvalor": ProcedimentoItemValorViewSet,
    "procedimentomaterial": ProcedimentoMaterialViewSet,
    "procedimentomaterialvalor": ProcedimentoMaterialValorViewSet,
    "prescricaoenfermagem": PrescricaoEnfermagemViewSet,
    "registroenfermagem": RegistroEnfermagemViewSet,
    "sinalvitalenfermagem": SinalVitalEnfermagemViewSet,
}


__all__ = [
    "EvolucaoEnfermagemViewSet",
    "PrescricaoEnfermagemViewSet",
    "ProcedimentoCatalogoViewSet",
    "ProcedimentoCatalogoMaterialViewSet",
    "ProcedimentoViewSet",
    "ProcedimentoItemViewSet",
    "ProcedimentoItemValorViewSet",
    "ProcedimentoMaterialViewSet",
    "ProcedimentoMaterialValorViewSet",
    "RegistroEnfermagemViewSet",
    "SinalVitalEnfermagemViewSet",
    "VIEWSET_MAP",
]
