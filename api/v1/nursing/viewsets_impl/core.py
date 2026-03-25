from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.nursing.models import (
    NursingEvolution,
    NursingPrescription,
    NursingRecord,
    NursingVitalSign,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureItemValue,
    ProcedureMaterial,
    ProcedureMaterialValue,
    Ward,
    WardAdmission,
    WardBed,
)

from ..filters import (
    NursingEvolutionFilter,
    NursingPrescriptionFilter,
    NursingRecordFilter,
    NursingVitalSignFilter,
    ProcedureCatalogFilter,
    ProcedureCatalogMaterialFilter,
    ProcedureFilter,
    ProcedureItemFilter,
    ProcedureItemValueFilter,
    ProcedureMaterialFilter,
    ProcedureMaterialValueFilter,
    WardAdmissionFilter,
    WardBedFilter,
    WardFilter,
)
from ..serializers import (
    NursingEvolutionSerializer,
    NursingPrescriptionSerializer,
    NursingRecordSerializer,
    NursingVitalSignSerializer,
    ProcedureCatalogMaterialSerializer,
    ProcedureCatalogSerializer,
    ProcedureItemSerializer,
    ProcedureItemValueSerializer,
    ProcedureMaterialSerializer,
    ProcedureMaterialValueSerializer,
    ProcedureSerializer,
    WardAdmissionSerializer,
    WardBedSerializer,
    WardSerializer,
)


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


class WardDashboardSummarySerializer(serializers.Serializer):
    pacientes = serializers.IntegerField()
    camas_total = serializers.IntegerField()
    camas_ocupadas = serializers.IntegerField()
    camas_livres = serializers.IntegerField()


class WardDashboardBedSerializer(serializers.Serializer):
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


class WardDashboardResponseSerializer(serializers.Serializer):
    resumo = WardDashboardSummarySerializer()
    camas = WardDashboardBedSerializer(many=True)


class NursingRecordViewSet(TenantScopedModelViewSet):
    queryset = NursingRecord.objects.all()
    serializer_class = NursingRecordSerializer
    filterset_class = NursingRecordFilter
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


class ProcedureCatalogViewSet(TenantScopedModelViewSet):
    queryset = ProcedureCatalog.objects.all()
    serializer_class = ProcedureCatalogSerializer
    filterset_class = ProcedureCatalogFilter
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


class ProcedureCatalogMaterialViewSet(TenantScopedModelViewSet):
    queryset = ProcedureCatalogMaterial.objects.all()
    serializer_class = ProcedureCatalogMaterialSerializer
    filterset_class = ProcedureCatalogMaterialFilter
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


class ProcedureViewSet(TenantScopedModelViewSet):
    queryset = Procedure.objects.all()
    serializer_class = ProcedureSerializer
    filterset_class = ProcedureFilter
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


class ProcedureItemViewSet(TenantScopedModelViewSet):
    queryset = ProcedureItem.objects.all()
    serializer_class = ProcedureItemSerializer
    filterset_class = ProcedureItemFilter
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


class ProcedureItemValueViewSet(TenantScopedModelViewSet):
    queryset = ProcedureItemValue.objects.all()
    serializer_class = ProcedureItemValueSerializer
    filterset_class = ProcedureItemValueFilter
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


class ProcedureMaterialViewSet(TenantScopedModelViewSet):
    queryset = ProcedureMaterial.objects.all()
    serializer_class = ProcedureMaterialSerializer
    filterset_class = ProcedureMaterialFilter
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


class ProcedureMaterialValueViewSet(TenantScopedModelViewSet):
    queryset = ProcedureMaterialValue.objects.all()
    serializer_class = ProcedureMaterialValueSerializer
    filterset_class = ProcedureMaterialValueFilter
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


class NursingVitalSignViewSet(TenantScopedModelViewSet):
    queryset = NursingVitalSign.objects.all()
    serializer_class = NursingVitalSignSerializer
    filterset_class = NursingVitalSignFilter
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


class NursingPrescriptionViewSet(TenantScopedModelViewSet):
    queryset = NursingPrescription.objects.all()
    serializer_class = NursingPrescriptionSerializer
    filterset_class = NursingPrescriptionFilter
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


class NursingEvolutionViewSet(TenantScopedModelViewSet):
    queryset = NursingEvolution.objects.all()
    serializer_class = NursingEvolutionSerializer
    filterset_class = NursingEvolutionFilter
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


class WardViewSet(TenantScopedModelViewSet):
    queryset = Ward.objects.all()
    serializer_class = WardSerializer
    filterset_class = WardFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "nome", "descricao"]
    ordering_fields = ["nome", "criado_em", "atualizado_em"]
    ordering = ["nome"]


class WardBedViewSet(TenantScopedModelViewSet):
    queryset = WardBed.objects.select_related("enfermaria").all()
    serializer_class = WardBedSerializer
    filterset_class = WardBedFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["id_custom", "numero", "enfermaria__nome"]
    ordering_fields = ["enfermaria", "numero", "criado_em", "atualizado_em"]
    ordering = ["enfermaria", "numero", "-criado_em"]


class WardAdmissionViewSet(TenantScopedModelViewSet):
    queryset = WardAdmission.objects.select_related(
        "cama",
        "cama__enfermaria",
        "paciente",
    ).all()
    serializer_class = WardAdmissionSerializer
    filterset_class = WardAdmissionFilter
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


class WardDashboardViewSet(ValidatedSearchOrderingMixin, ViewSet):
    """
    Operational ward dashboard (occupancy + upcoming medications).
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    @extend_schema(responses={200: WardDashboardResponseSerializer})
    def list(self, request):
        inquilino = getattr(request, "inquilino", None)

        camas_qs = WardBed.objects.filter(deletado=False, ativa=True)
        if inquilino is not None:
            camas_qs = camas_qs.filter(inquilino=inquilino)

        intern_qs = WardAdmission.objects.filter(deletado=False, ativo=True).select_related(
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
    "evolucaoenfermagem": NursingEvolutionViewSet,
    "procedimentocatalogo": ProcedureCatalogViewSet,
    "procedimentocatalogomaterial": ProcedureCatalogMaterialViewSet,
    "procedimento": ProcedureViewSet,
    "procedimentoitem": ProcedureItemViewSet,
    "procedimentoitemvalor": ProcedureItemValueViewSet,
    "procedimentomaterial": ProcedureMaterialViewSet,
    "procedimentomaterialvalor": ProcedureMaterialValueViewSet,
    "prescricaoenfermagem": NursingPrescriptionViewSet,
    "registroenfermagem": NursingRecordViewSet,
    "sinalvitalenfermagem": NursingVitalSignViewSet,
    "enfermaria": WardViewSet,
    "camaenfermaria": WardBedViewSet,
    "internamentoenfermaria": WardAdmissionViewSet,
    "enfermariadashboard": WardDashboardViewSet,
}


__all__ = [
    "VIEWSET_MAP",
    "NursingEvolutionViewSet",
    "NursingPrescriptionViewSet",
    "NursingRecordViewSet",
    "NursingVitalSignViewSet",
    "ProcedureCatalogMaterialViewSet",
    "ProcedureCatalogViewSet",
    "ProcedureItemValueViewSet",
    "ProcedureItemViewSet",
    "ProcedureMaterialValueViewSet",
    "ProcedureMaterialViewSet",
    "ProcedureViewSet",
    "WardAdmissionViewSet",
    "WardBedViewSet",
    "WardDashboardViewSet",
    "WardViewSet",
]


RegistroEnfermagemViewSet = NursingRecordViewSet
ProcedimentoCatalogoViewSet = ProcedureCatalogViewSet
ProcedimentoCatalogoMaterialViewSet = ProcedureCatalogMaterialViewSet
ProcedimentoViewSet = ProcedureViewSet
ProcedimentoItemViewSet = ProcedureItemViewSet
ProcedimentoItemValorViewSet = ProcedureItemValueViewSet
ProcedimentoMaterialViewSet = ProcedureMaterialViewSet
ProcedimentoMaterialValorViewSet = ProcedureMaterialValueViewSet
SinalVitalEnfermagemViewSet = NursingVitalSignViewSet
PrescricaoEnfermagemViewSet = NursingPrescriptionViewSet
EvolucaoEnfermagemViewSet = NursingEvolutionViewSet
EnfermariaViewSet = WardViewSet
CamaEnfermariaViewSet = WardBedViewSet
InternamentoEnfermariaViewSet = WardAdmissionViewSet
EnfermariaDashboardViewSet = WardDashboardViewSet
