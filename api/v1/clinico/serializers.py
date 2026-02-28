from rest_framework import serializers

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exame_campo import ExameCampo
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_analise_item import RequisicaoItem
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem

class ExameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exame
        fields = '__all__'

class ExameCampoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExameCampo
        fields = '__all__'

class PacienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paciente
        fields = '__all__'

class RequisicaoAnaliseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequisicaoAnalise
        fields = '__all__'

class RequisicaoItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequisicaoItem
        fields = '__all__'

class ResultadoItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResultadoItem
        fields = '__all__'

SERIALIZER_MAP = {
    'exame': ExameSerializer,
    'examecampo': ExameCampoSerializer,
    'paciente': PacienteSerializer,
    'requisicaoanalise': RequisicaoAnaliseSerializer,
    'requisicaoitem': RequisicaoItemSerializer,
    'resultadoitem': ResultadoItemSerializer,
}
