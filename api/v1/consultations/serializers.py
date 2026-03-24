from rest_framework import serializers

from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.billing.models.invoice import Invoice
from apps.human_resources.models.employee import Employee

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
    cargo_nome = serializers.CharField(source="cargo.nome", read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "nome", "profissao", "cargo", "cargo_nome"]


class ConsultaMedicaSerializer(serializers.ModelSerializer):
    # Permite criar consulta com `especialidade`; o model sincroniza tipo/preço.
    tipo = serializers.CharField(required=False, allow_blank=True)
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    medico_nome = serializers.SerializerMethodField()
    fatura_id = serializers.SerializerMethodField()
    fatura_codigo = serializers.SerializerMethodField()
    fatura_estado = serializers.SerializerMethodField()

    class Meta:
        model = MedicalConsultation
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "paciente_nome",
            "medico_nome",
            "fatura_id",
            "fatura_codigo",
            "fatura_estado",
            "tipo_horario",
            "multiplicador_preco",
        )

    def get_medico_nome(self, obj: MedicalConsultation) -> str:
        medico = getattr(obj, "medico", None)
        if not medico:
            return ""
        return getattr(medico, "nome", "") or ""

    def _get_fatura(self, obj: MedicalConsultation) -> Invoice | None:
        try:
            return getattr(obj, "fatura", None)
        except Exception:
            return None

    def get_fatura_id(self, obj: MedicalConsultation) -> int | None:
        f = self._get_fatura(obj)
        return getattr(f, "id", None) if f else None

    def get_fatura_codigo(self, obj: MedicalConsultation) -> str:
        f = self._get_fatura(obj)
        return getattr(f, "id_custom", "") if f else ""

    def get_fatura_estado(self, obj: MedicalConsultation) -> str:
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
        model = ConsultationSpecialty
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class FeriadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
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
