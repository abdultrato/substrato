import django_filters

from api.core.filters import SafeFilterSet

from aplicativos.auditoria_atividades.modelos.atividade_usuario import AtividadeUsuario
from aplicativos.identidade.modelos.usuario import Usuario


class UsuarioAuditoriaFilter(SafeFilterSet):
    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "is_active",
            "last_login",
        ]


class AtividadeUsuarioFilter(SafeFilterSet):
    inicio = django_filters.DateTimeFilter(field_name="criado_em", lookup_expr="gte")
    fim = django_filters.DateTimeFilter(field_name="criado_em", lookup_expr="lte")

    class Meta:
        model = AtividadeUsuario
        fields = [
            "usuario",
            "metodo",
            "caminho",
            "status_code",
            "view_basename",
            "view_action",
            "objeto_id",
            "criado_em",
        ]


FILTER_MAP = {
    "usuarios": UsuarioAuditoriaFilter,
    "atividade": AtividadeUsuarioFilter,
}

