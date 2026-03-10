from api.core.filters import SafeFilterSet

from aplicativos.enfermagem.modelos import (
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


class RegistroEnfermagemFilter(SafeFilterSet):
    class Meta:
        model = RegistroEnfermagem
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
        model = ProcedimentoCatalogo
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
        model = ProcedimentoCatalogoMaterial
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
        model = Procedimento
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
        model = ProcedimentoItem
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
        model = ProcedimentoMaterial
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
        model = ProcedimentoItemValor
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
        model = ProcedimentoMaterialValor
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
        model = SinalVitalEnfermagem
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


FILTER_MAP = {
    "procedimentocatalogo": ProcedimentoCatalogoFilter,
    "procedimentocatalogomaterial": ProcedimentoCatalogoMaterialFilter,
    "procedimento": ProcedimentoFilter,
    "procedimentoitem": ProcedimentoItemFilter,
    "procedimentoitemvalor": ProcedimentoItemValorFilter,
    "procedimentomaterial": ProcedimentoMaterialFilter,
    "procedimentomaterialvalor": ProcedimentoMaterialValorFilter,
    "registroenfermagem": RegistroEnfermagemFilter,
    "sinalvitalenfermagem": SinalVitalEnfermagemFilter,
}
