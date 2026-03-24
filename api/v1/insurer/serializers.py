from rest_framework import serializers

from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer


class AutorizacaoProcedimentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureAuthorization
        fields = "__all__"


class PlanoCoberturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoveragePlan
        fields = "__all__"


class SeguradoraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insurer
        fields = "__all__"


SERIALIZER_MAP = {
    "autorizacaoprocedimento": AutorizacaoProcedimentoSerializer,
    "planocobertura": PlanoCoberturaSerializer,
    "seguradora": SeguradoraSerializer,
}
