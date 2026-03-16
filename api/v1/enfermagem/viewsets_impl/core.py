from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.enfermagem.modelos import (
    CamaEnfermaria,
    Enfermaria,
    EvolucaoEnfermagem,
    InternamentoEnfermaria,
    PrescricaoEnfermagem,
    Procedimento,
    ProcedimentoCatalogo,
    ProcedimentoCatalogoMaterial,
    ProcedimentoItem,
    ProcedimentoItemValor,
    ProcedimentoMaterial,
    ProcedimentoMaterialValor,
    RegistroEnfermagem,
    SinalVitalEnfermagem,
)

from ..filters import (
    CamaEnfermariaFilter,
    EnfermariaFilter,
    EvolucaoEnfermagemFilter,
    InternamentoEnfermariaFilter,
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
from ..serializers import (
    CamaEnfermariaSerializer,
    EnfermariaSerializer,
    EvolucaoEnfermagemSerializer,
    InternamentoEnfermariaSerializer,
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


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


class EnfermariaDashboardResumoSerializer(serializers.Serializer):
    pacientes = serializers.IntegerField()
    camas_total = serializers.IntegerField()
    camas_ocupadas = serializers.IntegerField()
    camas_livres = serializers.IntegerField()


class EnfermariaDashboardCamaSerializer(serializers.Serializer):
    internamento_id = serializers.IntegerField()
    internamento_codigo = serializers.CharField(allow_blank=True)
    enfermaria = serializers.CharField(allow_blank=True)
    cama_id = serializers.IntegerField()
    cama_numero = serializers.CharField(allow_blank=True)
    paciente_id = serializers.IntegerField()
    paciente_nome = serializers.CharField(allow_blank=True)
    data_internamento = serializers.DateTimeField(required=False, allow_null=True)
    data_prevista_alta = serializers.DateTimeField(required=False, allow_null=True)
    tempo_estimado_observacao_horas = serializers.IntegerField(required=False, allow_null=True)
    proxima_medicacao_em = serializers.DateTimeField(required=False, allow_null=True)
    proxima_medicacao_descricao = serializers.CharField(required=False, allow_blank=True)


class EnfermariaDashboardResponseSerializer(serializers.Serializer):
    resumo = EnfermariaDashboardResumoSerializer()
    camas = EnfermariaDashboardCamaSerializer(many=True)


class RegistroEnfermagemViewSet(TenantScopedModelViewSet):
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


class ProcedimentoCatalogoViewSet(TenantScopedModelViewSet):
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


class ProcedimentoCatalogoMaterialViewSet(TenantScopedModelViewSet):
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


class ProcedimentoViewSet(TenantScopedModelViewSet):
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


class ProcedimentoItemViewSet(TenantScopedModelViewSet):
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        item = serializer.instance
        warnings = []
        if item is not None:
            pendentes = item.materiais_gerados.filter(movimento_estoque__isnull=True).select_related("produto").all()
            for material in pendentes:
                warnings.append(
                    {
                        "tipo": "ESTOQUE_INSUFICIENTE",
                        "produto_id": material.produto_id,
                        "produto": material.produto.nome,
                        "quantidade": material.quantidade,
                        "mensagem": (f"Estoque insuficiente na farmácia para '{material.produto.nome}'."),
                    }
                )

        data = dict(serializer.data)
        if warnings:
            data["warnings"] = warnings

        headers = self.get_success_headers(serializer.data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)


class ProcedimentoItemValorViewSet(TenantScopedModelViewSet):
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


class ProcedimentoMaterialViewSet(TenantScopedModelViewSet):
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


class ProcedimentoMaterialValorViewSet(TenantScopedModelViewSet):
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


class SinalVitalEnfermagemViewSet(TenantScopedModelViewSet):
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


class PrescricaoEnfermagemViewSet(TenantScopedModelViewSet):
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


class EvolucaoEnfermagemViewSet(TenantScopedModelViewSet):
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


class EnfermariaViewSet(TenantScopedModelViewSet):
    queryset = Enfermaria.objects.all()
    serializer_class = EnfermariaSerializer
    filterset_class = EnfermariaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "descricao"]
    ordering_fields = ["nome", "criado_em", "atualizado_em"]
    ordering = ["nome"]


class CamaEnfermariaViewSet(TenantScopedModelViewSet):
    queryset = CamaEnfermaria.objects.select_related("enfermaria").all()
    serializer_class = CamaEnfermariaSerializer
    filterset_class = CamaEnfermariaFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "numero", "enfermaria__nome"]
    ordering_fields = ["enfermaria", "numero", "criado_em", "atualizado_em"]
    ordering = ["enfermaria", "numero", "-criado_em"]


class InternamentoEnfermariaViewSet(TenantScopedModelViewSet):
    queryset = InternamentoEnfermaria.objects.select_related(
        "cama",
        "cama__enfermaria",
        "paciente",
    ).all()
    serializer_class = InternamentoEnfermariaSerializer
    filterset_class = InternamentoEnfermariaFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "id_custom",
        "paciente__nome",
        "cama__numero",
        "cama__enfermaria__nome",
        "proxima_medicacao_descricao",
        "observacoes",
    ]
    ordering_fields = [
        "data_internamento",
        "data_prevista_alta",
        "alta_em",
        "proxima_medicacao_em",
        "criado_em",
    ]
    ordering = ["-data_internamento", "-criado_em"]


class EnfermariaDashboardViewSet(ValidatedSearchOrderingMixin, ViewSet):
    """
    Dashboard operacional da Enfermaria (ocupação + próximas medicações).
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    @extend_schema(responses={200: EnfermariaDashboardResponseSerializer})
    def list(self, request):
        inquilino = getattr(request, "inquilino", None)

        camas_qs = CamaEnfermaria.objects.filter(deletado=False, ativa=True)
        if inquilino is not None:
            camas_qs = camas_qs.filter(inquilino=inquilino)

        intern_qs = InternamentoEnfermaria.objects.filter(deletado=False, ativo=True).select_related(
            "cama", "cama__enfermaria", "paciente"
        )
        if inquilino is not None:
            intern_qs = intern_qs.filter(inquilino=inquilino)

        total_camas = camas_qs.count()
        camas_ocupadas = intern_qs.values("cama_id").distinct().count()
        pacientes = intern_qs.values("paciente_id").distinct().count()

        camas = []
        for it in intern_qs.order_by("cama__enfermaria__nome", "cama__numero", "proxima_medicacao_em"):
            camas.append(
                {
                    "internamento_id": it.id,
                    "internamento_codigo": getattr(it, "id_custom", "") or "",
                    "enfermaria": getattr(getattr(it.cama, "enfermaria", None), "nome", "") or "",
                    "cama_id": it.cama_id,
                    "cama_numero": getattr(it.cama, "numero", "") or "",
                    "paciente_id": it.paciente_id,
                    "paciente_nome": getattr(it.paciente, "nome", "") or "",
                    "data_internamento": getattr(it, "data_internamento", None),
                    "data_prevista_alta": getattr(it, "data_prevista_alta", None),
                    "tempo_estimado_observacao_horas": getattr(it, "tempo_estimado_observacao_horas", None),
                    "proxima_medicacao_em": getattr(it, "proxima_medicacao_em", None),
                    "proxima_medicacao_descricao": getattr(it, "proxima_medicacao_descricao", "") or "",
                }
            )

        return Response(
            {
                "resumo": {
                    "pacientes": pacientes,
                    "camas_total": total_camas,
                    "camas_ocupadas": camas_ocupadas,
                    "camas_livres": max(0, total_camas - camas_ocupadas),
                },
                "camas": camas,
            }
        )


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
    "enfermaria": EnfermariaViewSet,
    "camaenfermaria": CamaEnfermariaViewSet,
    "internamentoenfermaria": InternamentoEnfermariaViewSet,
    "enfermariadashboard": EnfermariaDashboardViewSet,
}


__all__ = [
    "VIEWSET_MAP",
    "CamaEnfermariaViewSet",
    "EnfermariaDashboardViewSet",
    "EnfermariaViewSet",
    "EvolucaoEnfermagemViewSet",
    "InternamentoEnfermariaViewSet",
    "PrescricaoEnfermagemViewSet",
    "ProcedimentoCatalogoMaterialViewSet",
    "ProcedimentoCatalogoViewSet",
    "ProcedimentoItemValorViewSet",
    "ProcedimentoItemViewSet",
    "ProcedimentoMaterialValorViewSet",
    "ProcedimentoMaterialViewSet",
    "ProcedimentoViewSet",
    "RegistroEnfermagemViewSet",
    "SinalVitalEnfermagemViewSet",
]
