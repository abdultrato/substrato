from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.equipamentos.modelos.equipamento import Equipamento
from aplicativos.inspecoes.modelos.inspecao_diaria import InspecaoDiaria
from aplicativos.manutencoes.modelos.manutencao import Manutencao
from aplicativos.ocorrencias.modelos.ocorrencia import Ocorrencia

from ..filters import EquipamentoFilter, InspecaoDiariaFilter, ManutencaoFilter, OcorrenciaFilter
from ..serializers import (
    EquipamentoSerializer,
    InspecaoDiariaSerializer,
    ManutencaoSerializer,
    OcorrenciaSerializer,
)


class EquipamentoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Equipamento.objects.all()
    serializer_class = EquipamentoSerializer
    filterset_class = EquipamentoFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "nome",
        "numero_serie",
        "fabricante",
        "modelo",
        "localizacao",
        "responsavel",
    ]
    ordering_fields = [
        "nome",
        "numero_serie",
        "estado_aquisicao",
        "estado_operacional_inicial",
        "ativo",
        "criado_em",
        "atualizado_em",
    ]
    ordering = ["nome"]


class InspecaoDiariaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InspecaoDiaria.objects.select_related("equipamento")
    serializer_class = InspecaoDiariaSerializer
    filterset_class = InspecaoDiariaFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "equipamento__nome",
        "equipamento__numero_serie",
        "avaliacao",
        "observacoes",
    ]
    ordering_fields = [
        "data",
        "funcionamento",
        "limpeza_realizada",
        "criado_em",
        "atualizado_em",
    ]
    ordering = ["-data", "-criado_em"]


class ManutencaoViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Manutencao.objects.select_related("equipamento")
    serializer_class = ManutencaoSerializer
    filterset_class = ManutencaoFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "equipamento__nome",
        "equipamento__numero_serie",
        "descricao",
        "tecnico",
    ]
    ordering_fields = [
        "data_programada",
        "data_realizada",
        "tipo",
        "criado_em",
        "atualizado_em",
    ]
    ordering = ["-data_programada", "-criado_em"]


class OcorrenciaViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Ocorrencia.objects.select_related("equipamento")
    serializer_class = OcorrenciaSerializer
    filterset_class = OcorrenciaFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "equipamento__nome",
        "equipamento__numero_serie",
        "descricao",
        "contacto_assistencia",
    ]
    ordering_fields = [
        "data",
        "tipo",
        "resolvido",
        "criado_em",
        "atualizado_em",
    ]
    ordering = ["-data", "-criado_em"]


VIEWSET_MAP = {
    "equipamento": EquipamentoViewSet,
    "inspecaodiaria": InspecaoDiariaViewSet,
    "manutencao": ManutencaoViewSet,
    "ocorrencia": OcorrenciaViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "EquipamentoViewSet",
    "InspecaoDiariaViewSet",
    "ManutencaoViewSet",
    "OcorrenciaViewSet",
]
