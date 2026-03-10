from rest_framework import serializers

from aplicativos.enfermagem.modelos import (
    Procedimento,
    ProcedimentoItem,
    RegistroEnfermagem,
    SinalVitalEnfermagem,
)


class RegistroEnfermagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroEnfermagem
        fields = "__all__"


class ProcedimentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procedimento
        fields = "__all__"


class ProcedimentoItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedimentoItem
        fields = "__all__"


class SinalVitalEnfermagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SinalVitalEnfermagem
        fields = "__all__"


SERIALIZER_MAP = {
    "procedimento": ProcedimentoSerializer,
    "procedimentoitem": ProcedimentoItemSerializer,
    "registroenfermagem": RegistroEnfermagemSerializer,
    "sinalvitalenfermagem": SinalVitalEnfermagemSerializer,
}
