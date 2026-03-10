from rest_framework import serializers

from aplicativos.enfermagem.modelos import (
    ProcedimentoCatalogo,
    ProcedimentoCatalogoMaterial,
    Procedimento,
    ProcedimentoItem,
    ProcedimentoItemValor,
    ProcedimentoMaterial,
    ProcedimentoMaterialValor,
    RegistroEnfermagem,
    SinalVitalEnfermagem,
)


class RegistroEnfermagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroEnfermagem
        fields = "__all__"


class ProcedimentoCatalogoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedimentoCatalogo
        fields = "__all__"


class ProcedimentoCatalogoMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedimentoCatalogoMaterial
        fields = "__all__"


class ProcedimentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procedimento
        fields = "__all__"


class ProcedimentoItemSerializer(serializers.ModelSerializer):
    valor_unitario = serializers.DecimalField(
        source="valor.preco_unitario",
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ProcedimentoItem
        exclude = ("preco_unitario",)


class ProcedimentoMaterialSerializer(serializers.ModelSerializer):
    valor_unitario = serializers.DecimalField(
        source="valor.custo_unitario",
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ProcedimentoMaterial
        exclude = ("custo_unitario",)


class ProcedimentoItemValorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedimentoItemValor
        fields = "__all__"


class ProcedimentoMaterialValorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedimentoMaterialValor
        fields = "__all__"


class SinalVitalEnfermagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SinalVitalEnfermagem
        fields = "__all__"


SERIALIZER_MAP = {
    "procedimentocatalogo": ProcedimentoCatalogoSerializer,
    "procedimentocatalogomaterial": ProcedimentoCatalogoMaterialSerializer,
    "procedimento": ProcedimentoSerializer,
    "procedimentoitem": ProcedimentoItemSerializer,
    "procedimentoitemvalor": ProcedimentoItemValorSerializer,
    "procedimentomaterial": ProcedimentoMaterialSerializer,
    "procedimentomaterialvalor": ProcedimentoMaterialValorSerializer,
    "registroenfermagem": RegistroEnfermagemSerializer,
    "sinalvitalenfermagem": SinalVitalEnfermagemSerializer,
}
