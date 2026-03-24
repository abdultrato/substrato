from api.core.filters import SafeFilterSet
from apps.equipment.models.equipment import Equipment
from apps.inspections.models.daily_inspection import DailyInspection
from apps.maintenance.models.maintenance import Maintenance
from apps.incidents.models.incident import Incident


class EquipamentoFilter(SafeFilterSet):
    class Meta:
        model = Equipment
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
        model = DailyInspection
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
        model = Maintenance
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
        model = Incident
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
