from rest_framework import serializers

from aplicativos.seguradora.modelos.autorizacao import AutorizacaoProcedimento
from aplicativos.seguradora.modelos.plano_cobertura import PlanoCobertura
from aplicativos.seguradora.modelos.seguradora import Seguradora

class AutorizacaoProcedimentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutorizacaoProcedimento
        fields = '__all__'

class PlanoCoberturaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanoCobertura
        fields = '__all__'

class SeguradoraSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seguradora
        fields = '__all__'

SERIALIZER_MAP = {
    'autorizacaoprocedimento': AutorizacaoProcedimentoSerializer,
    'planocobertura': PlanoCoberturaSerializer,
    'seguradora': SeguradoraSerializer,
}
