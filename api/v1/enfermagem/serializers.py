from rest_framework import serializers

from aplicativos.enfermagem.modelos import (
    CamaEnfermaria,
    Enfermaria,
    EvolucaoEnfermagem,
    InternamentoEnfermaria,
    PrescricaoEnfermagem,
    Procedimento,
    ProcedimentoCatalogo,
    ProcedimentoCatalogoMaterial,
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


class PrescricaoEnfermagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescricaoEnfermagem
        fields = "__all__"


class EvolucaoEnfermagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvolucaoEnfermagem
        fields = "__all__"


class EnfermariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enfermaria
        fields = "__all__"


class CamaEnfermariaSerializer(serializers.ModelSerializer):
    enfermaria_nome = serializers.CharField(source="enfermaria.nome", read_only=True)

    class Meta:
        model = CamaEnfermaria
        fields = "__all__"


class InternamentoEnfermariaSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    cama_numero = serializers.CharField(source="cama.numero", read_only=True)
    enfermaria_nome = serializers.CharField(source="cama.enfermaria.nome", read_only=True)

    class Meta:
        model = InternamentoEnfermaria
        fields = "__all__"


SERIALIZER_MAP = {
    "evolucaoenfermagem": EvolucaoEnfermagemSerializer,
    "procedimentocatalogo": ProcedimentoCatalogoSerializer,
    "procedimentocatalogomaterial": ProcedimentoCatalogoMaterialSerializer,
    "procedimento": ProcedimentoSerializer,
    "procedimentoitem": ProcedimentoItemSerializer,
    "procedimentoitemvalor": ProcedimentoItemValorSerializer,
    "procedimentomaterial": ProcedimentoMaterialSerializer,
    "procedimentomaterialvalor": ProcedimentoMaterialValorSerializer,
    "prescricaoenfermagem": PrescricaoEnfermagemSerializer,
    "registroenfermagem": RegistroEnfermagemSerializer,
    "sinalvitalenfermagem": SinalVitalEnfermagemSerializer,
    "enfermaria": EnfermariaSerializer,
    "camaenfermaria": CamaEnfermariaSerializer,
    "internamentoenfermaria": InternamentoEnfermariaSerializer,
}
