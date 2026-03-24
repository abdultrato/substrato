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


class NursingRecordFilter(SafeFilterSet):
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


class ProcedureCatalogFilter(SafeFilterSet):
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


class ProcedureCatalogMaterialFilter(SafeFilterSet):
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


class ProcedureFilter(SafeFilterSet):
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


class ProcedureItemFilter(SafeFilterSet):
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


class ProcedureMaterialFilter(SafeFilterSet):
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


class ProcedureItemValueFilter(SafeFilterSet):
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


class ProcedureMaterialValueFilter(SafeFilterSet):
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


class NursingVitalSignFilter(SafeFilterSet):
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


class NursingPrescriptionFilter(SafeFilterSet):
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


class NursingEvolutionFilter(SafeFilterSet):
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


class WardFilter(SafeFilterSet):
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


class WardBedFilter(SafeFilterSet):
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


class WardAdmissionFilter(SafeFilterSet):
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
    "evolucaoenfermagem": NursingEvolutionFilter,
    "procedimentocatalogo": ProcedureCatalogFilter,
    "procedimentocatalogomaterial": ProcedureCatalogMaterialFilter,
    "procedimento": ProcedureFilter,
    "procedimentoitem": ProcedureItemFilter,
    "procedimentoitemvalor": ProcedureItemValueFilter,
    "procedimentomaterial": ProcedureMaterialFilter,
    "procedimentomaterialvalor": ProcedureMaterialValueFilter,
    "prescricaoenfermagem": NursingPrescriptionFilter,
    "registroenfermagem": NursingRecordFilter,
    "sinalvitalenfermagem": NursingVitalSignFilter,
    "enfermaria": WardFilter,
    "camaenfermaria": WardBedFilter,
    "internamentoenfermaria": WardAdmissionFilter,
}


RegistroEnfermagemFilter = NursingRecordFilter
ProcedimentoCatalogoFilter = ProcedureCatalogFilter
ProcedimentoCatalogoMaterialFilter = ProcedureCatalogMaterialFilter
ProcedimentoFilter = ProcedureFilter
ProcedimentoItemFilter = ProcedureItemFilter
ProcedimentoMaterialFilter = ProcedureMaterialFilter
ProcedimentoItemValorFilter = ProcedureItemValueFilter
ProcedimentoMaterialValorFilter = ProcedureMaterialValueFilter
SinalVitalEnfermagemFilter = NursingVitalSignFilter
PrescricaoEnfermagemFilter = NursingPrescriptionFilter
EvolucaoEnfermagemFilter = NursingEvolutionFilter
EnfermariaFilter = WardFilter
CamaEnfermariaFilter = WardBedFilter
InternamentoEnfermariaFilter = WardAdmissionFilter
