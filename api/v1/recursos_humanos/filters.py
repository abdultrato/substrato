from api.core.filters import SafeFilterSet
from aplicativos.recursos_humanos.modelos.agregado_familiar import AgregadoFamiliar
from aplicativos.recursos_humanos.modelos.cargo import Cargo
from aplicativos.recursos_humanos.modelos.dispensa import Dispensa
from aplicativos.recursos_humanos.modelos.falta import Falta
from aplicativos.recursos_humanos.modelos.ferias import Ferias
from aplicativos.recursos_humanos.modelos.folha_pagamento import FolhaPagamento
from aplicativos.recursos_humanos.modelos.funcionario import Funcionario
from aplicativos.recursos_humanos.modelos.hora_extra import HoraExtra
from aplicativos.recursos_humanos.modelos.horario_trabalho import HorarioTrabalho


class CargoFilter(SafeFilterSet):
    class Meta:
        model = Cargo
        fields = ["nome", "criado_em"]


class FuncionarioFilter(SafeFilterSet):
    class Meta:
        model = Funcionario
        fields = ["cargo", "profissao", "estado", "data_admissao", "criado_em"]


class AgregadoFamiliarFilter(SafeFilterSet):
    class Meta:
        model = AgregadoFamiliar
        fields = ["funcionario", "parentesco", "vive_com_funcionario", "criado_em"]


class HorarioTrabalhoFilter(SafeFilterSet):
    class Meta:
        model = HorarioTrabalho
        fields = ["funcionario", "dia_semana", "ativo"]


class FaltaFilter(SafeFilterSet):
    class Meta:
        model = Falta
        fields = ["funcionario", "data", "justificada"]


class FeriasFilter(SafeFilterSet):
    class Meta:
        model = Ferias
        fields = ["funcionario", "estado", "data_inicio"]


class DispensaFilter(SafeFilterSet):
    class Meta:
        model = Dispensa
        fields = ["funcionario", "tipo", "data"]


class HoraExtraFilter(SafeFilterSet):
    class Meta:
        model = HoraExtra
        fields = ["funcionario", "data"]


class FolhaPagamentoFilter(SafeFilterSet):
    class Meta:
        model = FolhaPagamento
        fields = ["funcionario", "ano", "mes", "fechado"]


FILTER_MAP = {
    "cargo": CargoFilter,
    "funcionario": FuncionarioFilter,
    "agregadofamiliar": AgregadoFamiliarFilter,
    "horario": HorarioTrabalhoFilter,
    "falta": FaltaFilter,
    "ferias": FeriasFilter,
    "dispensa": DispensaFilter,
    "horaextra": HoraExtraFilter,
    "folhapagamento": FolhaPagamentoFilter,
}
