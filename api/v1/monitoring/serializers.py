from rest_framework import serializers  # DRF base

from api.v1.compat import LegacyAliasSerializerMixin
from apps.monitoring.models.system_error import SystemError

CORE_READ_ONLY_FIELDS = (
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
)

SYSTEM_ERROR_ALIASES = {
    "id_custom": "custom_id",
    "utilizador": "user",
    "usuario": "user",
    "usuário": "user",
    "user": "user",
    "metodo": "method",
    "método": "method",
    "method": "method",
    "rota": "path",
    "caminho": "path",
    "path": "path",
    "route": "path",
    "url": "full_path",
    "url_completa": "full_path",
    "caminho_completo": "full_path",
    "full_path": "full_path",
    "codigo_estado": "status_code",
    "código_estado": "status_code",
    "codigo_http": "status_code",
    "código_http": "status_code",
    "status": "status_code",
    "status_http": "status_code",
    "http_status": "status_code",
    "duracao": "duration_ms",
    "duração": "duration_ms",
    "duracao_ms": "duration_ms",
    "duração_ms": "duration_ms",
    "tempo_ms": "duration_ms",
    "user_agent": "user_agent",
    "agente": "user_agent",
    "agente_utilizador": "user_agent",
    "agente_usuario": "user_agent",
    "view": "view_basename",
    "basename": "view_basename",
    "view_basename": "view_basename",
    "recurso": "view_basename",
    "acao": "view_action",
    "ação": "view_action",
    "view_action": "view_action",
    "objecto": "object_id",
    "objeto": "object_id",
    "object_id": "object_id",
    "classe_excecao": "exception_class",
    "classe_exceção": "exception_class",
    "tipo_erro": "exception_class",
    "tipo_de_erro": "exception_class",
    "exception": "exception_class",
    "exception_class": "exception_class",
    "erro": "exception_class",
    "mensagem": "message",
    "message": "message",
    "detalhe": "message",
    "detalhes": "message",
    "traceback": "traceback",
    "stack": "traceback",
    "rastro": "traceback",
    "metadados": "metadata",
    "metadata": "metadata",
}


class SystemErrorSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = SYSTEM_ERROR_ALIASES
    legacy_output_aliases = SYSTEM_ERROR_ALIASES

    user_name = serializers.SerializerMethodField(method_name="get_user_name")
    ip = serializers.CharField(read_only=True, allow_blank=True, allow_null=True)

    class Meta:
        model = SystemError
        fields = "__all__"
        read_only_fields = (*CORE_READ_ONLY_FIELDS, "user_name")

    def get_user_name(self, obj: SystemError) -> str:
        u = getattr(obj, "user", None)
        if not u:
            return ""
        try:
            return (u.get_full_name() or "").strip() or u.username
        except Exception:
            return getattr(u, "username", "")


class ExportJobSerializer(serializers.Serializer):
    id = serializers.CharField()
    status = serializers.CharField(allow_blank=True, allow_null=True)
    export_key = serializers.CharField(allow_blank=True, allow_null=True)
    created_at = serializers.CharField(allow_blank=True, allow_null=True)
    updated_at = serializers.CharField(allow_blank=True, allow_null=True)
    started_at = serializers.CharField(allow_blank=True, allow_null=True)
    finished_at = serializers.CharField(allow_blank=True, allow_null=True)
    filename = serializers.CharField(allow_blank=True, allow_null=True)
    content_type = serializers.CharField(allow_blank=True, allow_null=True)
    error = serializers.CharField(allow_blank=True, allow_null=True)
    status_url = serializers.URLField()
    download_url = serializers.URLField()


class ExportJobListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    results = ExportJobSerializer(many=True)


SERIALIZER_MAP = {
    "error": SystemErrorSerializer,
    "export_job": ExportJobSerializer,
}

