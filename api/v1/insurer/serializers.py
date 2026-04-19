from rest_framework import serializers  # DRF base

from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization


class ProcedureAuthorizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureAuthorization
        fields = "__all__"


class CoveragePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoveragePlan
        fields = "__all__"


class InsurerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insurer
        fields = "__all__"


SERIALIZER_MAP = {
    "autorizacaoprocedimento": ProcedureAuthorizationSerializer,
    "planocobertura": CoveragePlanSerializer,
    "insurer": InsurerSerializer,
}

