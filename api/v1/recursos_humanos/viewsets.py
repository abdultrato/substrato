from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from aplicativos.recursos_humanos.modelos.agregado_familiar import AgregadoFamiliar
from aplicativos.recursos_humanos.modelos.cargo import Cargo
from aplicativos.recursos_humanos.modelos.dispensa import Dispensa
from aplicativos.recursos_humanos.modelos.falta import Falta
from aplicativos.recursos_humanos.modelos.ferias import Ferias
from aplicativos.recursos_humanos.modelos.folha_pagamento import FolhaPagamento
from aplicativos.recursos_humanos.modelos.funcionario import Funcionario
from aplicativos.recursos_humanos.modelos.hora_extra import HoraExtra
from aplicativos.recursos_humanos.modelos.horario_trabalho import HorarioTrabalho

from .filters import (
    AgregadoFamiliarFilter,
    CargoFilter,
    DispensaFilter,
    FaltaFilter,
    FeriasFilter,
    FolhaPagamentoFilter,
    FuncionarioFilter,
    HoraExtraFilter,
    HorarioTrabalhoFilter,
)
from .serializers import (
    AgregadoFamiliarSerializer,
    CargoSerializer,
    DispensaSerializer,
    FaltaSerializer,
    FeriasSerializer,
    FolhaPagamentoSerializer,
    FuncionarioSerializer,
    HoraExtraSerializer,
    HorarioTrabalhoSerializer,
)


class TenantScopedModelViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        inquilino = getattr(self.request, "inquilino", None)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)
        return qs


class CargoViewSet(TenantScopedModelViewSet):
    queryset = Cargo.objects.all()
    serializer_class = CargoSerializer
    filterset_class = CargoFilter
    search_fields = ["id_custom", "nome"]
    ordering_fields = ["nome", "criado_em"]
    ordering = ["nome"]


class FuncionarioViewSet(TenantScopedModelViewSet):
    queryset = Funcionario.objects.select_related("cargo").all()
    serializer_class = FuncionarioSerializer
    filterset_class = FuncionarioFilter
    search_fields = ["id_custom", "nome", "email", "telefone"]
    ordering_fields = ["nome", "data_admissao", "estado", "criado_em"]
    ordering = ["nome"]


class AgregadoFamiliarViewSet(TenantScopedModelViewSet):
    queryset = AgregadoFamiliar.objects.select_related("funcionario").all()
    serializer_class = AgregadoFamiliarSerializer
    filterset_class = AgregadoFamiliarFilter
    search_fields = ["id_custom", "nome", "funcionario__nome"]
    ordering_fields = ["nome", "parentesco", "criado_em"]
    ordering = ["nome"]


class HorarioTrabalhoViewSet(TenantScopedModelViewSet):
    queryset = HorarioTrabalho.objects.select_related("funcionario").all()
    serializer_class = HorarioTrabalhoSerializer
    filterset_class = HorarioTrabalhoFilter
    ordering_fields = ["funcionario", "dia_semana", "hora_inicio"]
    ordering = ["funcionario", "dia_semana", "hora_inicio"]


class FaltaViewSet(TenantScopedModelViewSet):
    queryset = Falta.objects.select_related("funcionario").all()
    serializer_class = FaltaSerializer
    filterset_class = FaltaFilter
    ordering_fields = ["data", "criado_em"]
    ordering = ["-data", "-criado_em"]


class FeriasViewSet(TenantScopedModelViewSet):
    queryset = Ferias.objects.select_related("funcionario").all()
    serializer_class = FeriasSerializer
    filterset_class = FeriasFilter
    ordering_fields = ["data_inicio", "estado", "criado_em"]
    ordering = ["-data_inicio", "-criado_em"]


class DispensaViewSet(TenantScopedModelViewSet):
    queryset = Dispensa.objects.select_related("funcionario").all()
    serializer_class = DispensaSerializer
    filterset_class = DispensaFilter
    ordering_fields = ["data", "tipo", "criado_em"]
    ordering = ["-data", "-criado_em"]


class HoraExtraViewSet(TenantScopedModelViewSet):
    queryset = HoraExtra.objects.select_related("funcionario").all()
    serializer_class = HoraExtraSerializer
    filterset_class = HoraExtraFilter
    ordering_fields = ["data", "criado_em"]
    ordering = ["-data", "-criado_em"]


class FolhaPagamentoViewSet(TenantScopedModelViewSet):
    queryset = FolhaPagamento.objects.select_related("funcionario").all()
    serializer_class = FolhaPagamentoSerializer
    filterset_class = FolhaPagamentoFilter
    ordering_fields = ["ano", "mes", "criado_em", "fechado"]
    ordering = ["-ano", "-mes", "-criado_em"]


VIEWSET_MAP = {
    "cargo": CargoViewSet,
    "funcionario": FuncionarioViewSet,
    "agregadofamiliar": AgregadoFamiliarViewSet,
    "horario": HorarioTrabalhoViewSet,
    "falta": FaltaViewSet,
    "ferias": FeriasViewSet,
    "dispensa": DispensaViewSet,
    "horaextra": HoraExtraViewSet,
    "folhapagamento": FolhaPagamentoViewSet,
}

__all__ = [
    "CargoViewSet",
    "FuncionarioViewSet",
    "AgregadoFamiliarViewSet",
    "HorarioTrabalhoViewSet",
    "FaltaViewSet",
    "FeriasViewSet",
    "DispensaViewSet",
    "HoraExtraViewSet",
    "FolhaPagamentoViewSet",
    "VIEWSET_MAP",
]
