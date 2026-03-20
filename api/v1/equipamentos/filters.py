from api.core.filters import SafeFilterSet
from aplicativos.equipamentos.modelos.equipamento import Equipamento
from aplicativos.inspecoes.modelos.inspecao_diaria import InspecaoDiaria
from aplicativos.manutencoes.modelos.manutencao import Manutencao
from aplicativos.ocorrencias.modelos.ocorrencia import Ocorrencia


class EquipamentoFilter(SafeFilterSet):
    class Meta:
        model = Equipamento
        fields = [
            "inquilino",
            "id_custom",
            "nome",
            "numero_serie",
            "data_aquisicao",
            "estado_aquisicao",
            "estado_operacional_inicial",
            "tipo_avaria_inicial",
            "fabricante",
            "modelo",
            "localizacao",
            "responsavel",
            "ativo",
            "deletado",
            "criado_em",
            "atualizado_em",
        ]


class InspecaoDiariaFilter(SafeFilterSet):
    class Meta:
        model = InspecaoDiaria
        fields = [
            "inquilino",
            "id_custom",
            "equipamento",
            "data",
            "funcionamento",
            "limpeza_realizada",
            "deletado",
            "criado_em",
            "atualizado_em",
        ]


class ManutencaoFilter(SafeFilterSet):
    class Meta:
        model = Manutencao
        fields = [
            "inquilino",
            "id_custom",
            "equipamento",
            "tipo",
            "data_programada",
            "data_realizada",
            "tecnico",
            "deletado",
            "criado_em",
            "atualizado_em",
        ]


class OcorrenciaFilter(SafeFilterSet):
    class Meta:
        model = Ocorrencia
        fields = [
            "inquilino",
            "id_custom",
            "equipamento",
            "data",
            "tipo",
            "resolvido",
            "deletado",
            "criado_em",
            "atualizado_em",
        ]


FILTER_MAP = {
    "equipamento": EquipamentoFilter,
    "inspecaodiaria": InspecaoDiariaFilter,
    "manutencao": ManutencaoFilter,
    "ocorrencia": OcorrenciaFilter,
}
