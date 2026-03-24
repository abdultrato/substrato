from api.core.filters import SafeFilterSet
from apps.nursing.models import (
    WardBed,
    Ward,
    NursingEvolution,
    WardAdmission,
    NursingPrescription,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureItemValue,
    ProcedureMaterial,
    ProcedureMaterialValue,
    NursingRecord,
    NursingVitalSign,
)


class RegistroEnfermagemFilter(SafeFilterSet):
    class Meta:
        model = NursingRecord
        fields = [
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


class ProcedimentoCatalogoFilter(SafeFilterSet):
    class Meta:
        model = ProcedureCatalog
        fields = [
            "inquilino",
            "id_custom",
            "nome",
            "preco_padrao",
            "criado_em",
            "atualizado_em",
            "deletado",
        ]


class ProcedimentoCatalogoMaterialFilter(SafeFilterSet):
    class Meta:
        model = ProcedureCatalogMaterial
        fields = [
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


class ProcedimentoFilter(SafeFilterSet):
    class Meta:
        model = Procedure
        fields = [
            "inquilino",
            "id_custom",
            "paciente",
            "profissional",
            "data_realizacao",
            "criado_em",
            "atualizado_em",
            "deletado",
        ]


class ProcedimentoItemFilter(SafeFilterSet):
    class Meta:
        model = ProcedureItem
        fields = [
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


class ProcedimentoMaterialFilter(SafeFilterSet):
    class Meta:
        model = ProcedureMaterial
        fields = [
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


class ProcedimentoItemValorFilter(SafeFilterSet):
    class Meta:
        model = ProcedureItemValue
        fields = [
            "inquilino",
            "id_custom",
            "item",
            "preco_unitario",
            "criado_em",
            "atualizado_em",
            "deletado",
        ]


class ProcedimentoMaterialValorFilter(SafeFilterSet):
    class Meta:
        model = ProcedureMaterialValue
        fields = [
            "inquilino",
            "id_custom",
            "material",
            "custo_unitario",
            "criado_em",
            "atualizado_em",
            "deletado",
        ]


class SinalVitalEnfermagemFilter(SafeFilterSet):
    class Meta:
        model = NursingVitalSign
        fields = [
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


class PrescricaoEnfermagemFilter(SafeFilterSet):
    class Meta:
        model = NursingPrescription
        fields = [
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


class EvolucaoEnfermagemFilter(SafeFilterSet):
    class Meta:
        model = NursingEvolution
        fields = [
            "inquilino",
            "id_custom",
            "nome",
            "paciente",
            "data_evolucao",
            "criado_em",
            "atualizado_em",
            "deletado",
        ]


class EnfermariaFilter(SafeFilterSet):
    class Meta:
        model = Ward
        fields = [
            "inquilino",
            "id_custom",
            "nome",
            "ativa",
            "criado_em",
            "atualizado_em",
            "deletado",
        ]


class CamaEnfermariaFilter(SafeFilterSet):
    class Meta:
        model = WardBed
        fields = [
            "inquilino",
            "id_custom",
            "enfermaria",
            "numero",
            "ativa",
            "criado_em",
            "atualizado_em",
            "deletado",
        ]


class InternamentoEnfermariaFilter(SafeFilterSet):
    class Meta:
        model = WardAdmission
        fields = [
            "inquilino",
            "id_custom",
            "cama",
            "paciente",
            "ativo",
            "data_internamento",
            "data_prevista_alta",
            "alta_em",
            "proxima_medicacao_em",
            "criado_em",
            "atualizado_em",
            "deletado",
        ]


FILTER_MAP = {
    "evolucaoenfermagem": EvolucaoEnfermagemFilter,
    "procedimentocatalogo": ProcedimentoCatalogoFilter,
    "procedimentocatalogomaterial": ProcedimentoCatalogoMaterialFilter,
    "procedimento": ProcedimentoFilter,
    "procedimentoitem": ProcedimentoItemFilter,
    "procedimentoitemvalor": ProcedimentoItemValorFilter,
    "procedimentomaterial": ProcedimentoMaterialFilter,
    "procedimentomaterialvalor": ProcedimentoMaterialValorFilter,
    "prescricaoenfermagem": PrescricaoEnfermagemFilter,
    "registroenfermagem": RegistroEnfermagemFilter,
    "sinalvitalenfermagem": SinalVitalEnfermagemFilter,
    "enfermaria": EnfermariaFilter,
    "camaenfermaria": CamaEnfermariaFilter,
    "internamentoenfermaria": InternamentoEnfermariaFilter,
}
