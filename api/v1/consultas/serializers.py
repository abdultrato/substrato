from rest_framework import serializers

from aplicativos.consultas.modelos.consulta_medica import ConsultaMedica
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.identidade.modelos.usuario import Usuario


class MedicoSerializer(serializers.ModelSerializer):
    nome = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ["id", "username", "first_name", "last_name", "nome"]

    def get_nome(self, obj):
        try:
            return (obj.get_full_name() or "").strip() or obj.username
        except Exception:
            return obj.username


class ConsultaMedicaSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    medico_nome = serializers.SerializerMethodField()
    fatura_id = serializers.SerializerMethodField()
    fatura_codigo = serializers.SerializerMethodField()
    fatura_estado = serializers.SerializerMethodField()

    class Meta:
        model = ConsultaMedica
        fields = [
            "id",
            "id_custom",
            "inquilino",
            "paciente",
            "paciente_nome",
            "medico",
            "medico_nome",
            "tipo",
            "descricao",
            "agendada_para",
            "estado",
            "preco",
            "concluida_em",
            "cancelada_em",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "deletado",
            "deletado_em",
            "deletado_por",
            "fatura_id",
            "fatura_codigo",
            "fatura_estado",
        ]
        read_only_fields = (
            "id_custom",
            "inquilino",
            "criado_por",
            "atualizado_por",
            "criado_em",
            "atualizado_em",
            "deletado",
            "deletado_em",
            "deletado_por",
            "fatura_id",
            "fatura_codigo",
            "fatura_estado",
        )

    def get_medico_nome(self, obj):
        u = getattr(obj, "medico", None)
        if not u:
            return ""
        try:
            return (u.get_full_name() or "").strip() or u.username
        except Exception:
            return getattr(u, "username", "")

    def _get_fatura(self, obj):
        try:
            return getattr(obj, "fatura", None)
        except Exception:
            return None

    def get_fatura_id(self, obj):
        f = self._get_fatura(obj)
        return getattr(f, "id", None) if f else None

    def get_fatura_codigo(self, obj):
        f = self._get_fatura(obj)
        return getattr(f, "id_custom", "") if f else ""

    def get_fatura_estado(self, obj):
        f = self._get_fatura(obj)
        return getattr(f, "estado", "") if f else ""


class CriarFaturaConsultaSerializer(serializers.Serializer):
    emitir = serializers.BooleanField(default=True)


SERIALIZER_MAP = {
    "consulta": ConsultaMedicaSerializer,
    "medicos": MedicoSerializer,
}

