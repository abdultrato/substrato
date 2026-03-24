from rest_framework import serializers

from apps.nursing.models import (
    WardBed,
    Ward,
    NursingEvolution,
    WardAdmission,
    NursingPrescription,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureItemValue,
    ProcedureMaterial,
    ProcedureMaterialValue,
    NursingRecord,
    NursingVitalSign,
)


class RegistroEnfermagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NursingRecord
        fields = "__all__"


class ProcedimentoCatalogoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureCatalog
        fields = "__all__"


class ProcedimentoCatalogoMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureCatalogMaterial
        fields = "__all__"


class ProcedimentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procedure
        fields = "__all__"


class ProcedimentoItemSerializer(serializers.ModelSerializer):
    valor_unitario = serializers.DecimalField(
        source="valor.preco_unitario",
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ProcedureItem
        exclude = ("preco_unitario",)


class ProcedimentoMaterialSerializer(serializers.ModelSerializer):
    valor_unitario = serializers.DecimalField(
        source="valor.custo_unitario",
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ProcedureMaterial
        exclude = ("custo_unitario",)


class ProcedimentoItemValorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureItemValue
        fields = "__all__"


class ProcedimentoMaterialValorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureMaterialValue
        fields = "__all__"


class SinalVitalEnfermagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NursingVitalSign
        fields = "__all__"


class PrescricaoEnfermagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NursingPrescription
        fields = "__all__"


class EvolucaoEnfermagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = NursingEvolution
        fields = "__all__"


class EnfermariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = "__all__"


class CamaEnfermariaSerializer(serializers.ModelSerializer):
    enfermaria_nome = serializers.CharField(source="enfermaria.nome", read_only=True)

    class Meta:
        model = WardBed
        fields = "__all__"


class InternamentoEnfermariaSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    cama_numero = serializers.CharField(source="cama.numero", read_only=True)
    enfermaria_nome = serializers.CharField(source="cama.enfermaria.nome", read_only=True)

    class Meta:
        model = WardAdmission
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
