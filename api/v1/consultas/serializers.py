from rest_framework import serializers

from aplicativos.consultas.modelos.consulta_medica import ConsultaMedica
from aplicativos.consultas.modelos.especialidade_consulta import EspecialidadeConsulta
from aplicativos.consultas.modelos.feriado import Feriado
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.identidade.modelos.usuario import Usuario

CORE_READ_ONLY_FIELDS = (
    "id",
    "id_custom",
    "inquilino",
    "criado_por",
    "atualizado_por",
    "criado_em",
    "atualizado_em",
    "deletado",
    "deletado_em",
    "deletado_por",
    "versao",
)


class MedicoSerializer(serializers.ModelSerializer):
    nome = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ["id", "username", "first_name", "last_name", "nome"]

    def get_nome(self, obj: Usuario) -> str:
        try:
            return (obj.get_full_name() or "").strip() or obj.username
        except Exception:
            return obj.username


class ConsultaMedicaSerializer(serializers.ModelSerializer):
    # Permite criar consulta apenas com `especialidade`; o model sincroniza tipo/preço.
    tipo = serializers.CharField(required=False, allow_blank=True)
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    medico_nome = serializers.SerializerMethodField()
    fatura_id = serializers.SerializerMethodField()
    fatura_codigo = serializers.SerializerMethodField()
    fatura_estado = serializers.SerializerMethodField()

    class Meta:
        model = ConsultaMedica
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "paciente_nome",
            "medico_nome",
            "fatura_id",
            "fatura_codigo",
            "fatura_estado",
        )

    def get_medico_nome(self, obj: ConsultaMedica) -> str:
        u = getattr(obj, "medico", None)
        if not u:
            return ""
        try:
            return (u.get_full_name() or "").strip() or u.username
        except Exception:
            return getattr(u, "username", "")

    def _get_fatura(self, obj: ConsultaMedica) -> Fatura | None:
        try:
            return getattr(obj, "fatura", None)
        except Exception:
            return None

    def get_fatura_id(self, obj: ConsultaMedica) -> int | None:
        f = self._get_fatura(obj)
        return getattr(f, "id", None) if f else None

    def get_fatura_codigo(self, obj: ConsultaMedica) -> str:
        f = self._get_fatura(obj)
        return getattr(f, "id_custom", "") if f else ""

    def get_fatura_estado(self, obj: ConsultaMedica) -> str:
        f = self._get_fatura(obj)
        return getattr(f, "estado", "") if f else ""

    def validate(self, attrs):
        attrs = super().validate(attrs)

        especialidade = attrs.get("especialidade") or getattr(self.instance, "especialidade", None)

        tipo = (attrs.get("tipo") or getattr(self.instance, "tipo", "") or "").strip()
        if especialidade and not tipo:
            attrs["tipo"] = (getattr(especialidade, "nome", "") or "").strip()
            tipo = (attrs.get("tipo") or "").strip()

        if not especialidade and not tipo:
            raise serializers.ValidationError({"tipo": "Informe o tipo/nome do serviço da consulta."})

        return attrs


class EspecialidadeConsultaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecialidadeConsulta
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class FeriadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feriado
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class CriarFaturaConsultaSerializer(serializers.Serializer):
    emitir = serializers.BooleanField(default=True)


class RemarcarConsultaSerializer(serializers.Serializer):
    agendada_para = serializers.DateTimeField()


class CancelarConsultaSerializer(serializers.Serializer):
    motivo = serializers.CharField(required=False, allow_blank=True, max_length=255)


SERIALIZER_MAP = {
    "consulta": ConsultaMedicaSerializer,
    "medicos": MedicoSerializer,
    "especialidade": EspecialidadeConsultaSerializer,
    "feriado": FeriadoSerializer,
}
