from api.core.filters import SafeFilterSet

from aplicativos.prontuario.modelos.registro_prontuario import RegistroProntuario
from aplicativos.prontuario.modelos.prescricao_item import PrescricaoItem


class RegistroProntuarioFilter(SafeFilterSet):
    class Meta:
        model = RegistroProntuario
        fields = [
            "paciente",
            "medico",
            "consultas",
            "estado",
            "inicio_atendimento",
            "fim_atendimento",
            "criado_em",
        ]


class PrescricaoItemFilter(SafeFilterSet):
    class Meta:
        model = PrescricaoItem
        fields = [
            "registro",
            "medicacao",
            "dosagem_unidade",
            "numero_doses",
            "criado_em",
        ]


FILTER_MAP = {
    "registro": RegistroProntuarioFilter,
    "prescricaoitem": PrescricaoItemFilter,
}
