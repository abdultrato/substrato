from api.core.filters import SafeFilterSet

from aplicativos.enfermagem.modelos import (
    Procedimento,
    ProcedimentoItem,
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
            "descricao",
            "quantidade",
            "realizado",
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
    "procedimento": ProcedimentoFilter,
    "procedimentoitem": ProcedimentoItemFilter,
    "registroenfermagem": RegistroEnfermagemFilter,
    "sinalvitalenfermagem": SinalVitalEnfermagemFilter,
}
