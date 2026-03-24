from rest_framework import serializers

from apps.surgery.models.surgery import Surgery
from apps.surgery.models.surgical_procedure import SurgicalProcedure

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


class CirurgiaSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    cirurgiao_nome = serializers.SerializerMethodField()
    procedimentos_nomes = serializers.SerializerMethodField()
    fatura_id = serializers.SerializerMethodField()
    fatura_codigo = serializers.SerializerMethodField()
    fatura_estado = serializers.SerializerMethodField()

    class Meta:
        model = Surgery
        fields = "__all__"
        read_only_fields = (
            *CORE_READ_ONLY_FIELDS,
            "paciente_nome",
            "cirurgiao_nome",
            "procedimentos_nomes",
            "fatura_id",
            "fatura_codigo",
            "fatura_estado",
        )

    def get_cirurgiao_nome(self, obj: Surgery) -> str:
        u = getattr(obj, "cirurgiao", None)
        if not u:
            return ""
        try:
            return (u.get_full_name() or "").strip() or u.username
        except Exception:
            return getattr(u, "username", "")

    def get_procedimentos_nomes(self, obj: Surgery) -> list[str]:
        try:
            return list(obj.procedimentos.values_list("nome", flat=True))
        except Exception:
            return []

    def _get_fatura(self, obj: Surgery):
        try:
            return getattr(obj, "fatura", None)
        except Exception:
            return None

    def get_fatura_id(self, obj: Surgery) -> int | None:
        f = self._get_fatura(obj)
        return getattr(f, "id", None) if f else None

    def get_fatura_codigo(self, obj: Surgery) -> str:
        f = self._get_fatura(obj)
        return getattr(f, "id_custom", "") if f else ""

    def get_fatura_estado(self, obj: Surgery) -> str:
        f = self._get_fatura(obj)
        return getattr(f, "estado", "") if f else ""


class ProcedimentoCirurgicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurgicalProcedure
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "cirurgia": CirurgiaSerializer,
    "procedimentocirurgico": ProcedimentoCirurgicoSerializer,
}
