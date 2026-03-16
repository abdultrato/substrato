from api.core.filters import SafeFilterSet
from aplicativos.monitoramento.modelos.erro_sistema import ErroSistema


class ErroSistemaFilter(SafeFilterSet):
    class Meta:
        model = ErroSistema
        fields = [
            "usuario",
            "status_code",
            "exception_class",
            "caminho",
            "view_basename",
            "view_action",
            "criado_em",
        ]


FILTER_MAP = {
    "erro": ErroSistemaFilter,
}
