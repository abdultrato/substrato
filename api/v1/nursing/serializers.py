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


class NursingRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = NursingRecord
        fields = "__all__"


class ProcedureCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureCatalog
        fields = "__all__"


class ProcedureCatalogMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureCatalogMaterial
        fields = "__all__"


class ProcedureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procedure
        fields = "__all__"


class ProcedureItemSerializer(serializers.ModelSerializer):
    valor_unitario = serializers.DecimalField(
        source="valor.preco_unitario",
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ProcedureItem
        exclude = ("preco_unitario",)


class ProcedureMaterialSerializer(serializers.ModelSerializer):
    valor_unitario = serializers.DecimalField(
        source="valor.custo_unitario",
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ProcedureMaterial
        exclude = ("custo_unitario",)


class ProcedureItemValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureItemValue
        fields = "__all__"


class ProcedureMaterialValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcedureMaterialValue
        fields = "__all__"


class NursingVitalSignSerializer(serializers.ModelSerializer):
    class Meta:
        model = NursingVitalSign
        fields = "__all__"


class NursingPrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = NursingPrescription
        fields = "__all__"


class NursingEvolutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = NursingEvolution
        fields = "__all__"


class WardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ward
        fields = "__all__"


class WardBedSerializer(serializers.ModelSerializer):
    enfermaria_nome = serializers.CharField(source="enfermaria.nome", read_only=True)

    class Meta:
        model = WardBed
        fields = "__all__"


class WardAdmissionSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    cama_numero = serializers.CharField(source="cama.numero", read_only=True)
    enfermaria_nome = serializers.CharField(source="cama.enfermaria.nome", read_only=True)

    class Meta:
        model = WardAdmission
        fields = "__all__"


SERIALIZER_MAP = {
    "evolucaoenfermagem": NursingEvolutionSerializer,
    "procedimentocatalogo": ProcedureCatalogSerializer,
    "procedimentocatalogomaterial": ProcedureCatalogMaterialSerializer,
    "procedimento": ProcedureSerializer,
    "procedimentoitem": ProcedureItemSerializer,
    "procedimentoitemvalor": ProcedureItemValueSerializer,
    "procedimentomaterial": ProcedureMaterialSerializer,
    "procedimentomaterialvalor": ProcedureMaterialValueSerializer,
    "prescricaoenfermagem": NursingPrescriptionSerializer,
    "registroenfermagem": NursingRecordSerializer,
    "sinalvitalenfermagem": NursingVitalSignSerializer,
    "enfermaria": WardSerializer,
    "camaenfermaria": WardBedSerializer,
    "internamentoenfermaria": WardAdmissionSerializer,
}


RegistroEnfermagemSerializer = NursingRecordSerializer
ProcedimentoCatalogoSerializer = ProcedureCatalogSerializer
ProcedimentoCatalogoMaterialSerializer = ProcedureCatalogMaterialSerializer
ProcedimentoSerializer = ProcedureSerializer
ProcedimentoItemSerializer = ProcedureItemSerializer
ProcedimentoMaterialSerializer = ProcedureMaterialSerializer
ProcedimentoItemValorSerializer = ProcedureItemValueSerializer
ProcedimentoMaterialValorSerializer = ProcedureMaterialValueSerializer
SinalVitalEnfermagemSerializer = NursingVitalSignSerializer
PrescricaoEnfermagemSerializer = NursingPrescriptionSerializer
EvolucaoEnfermagemSerializer = NursingEvolutionSerializer
EnfermariaSerializer = WardSerializer
CamaEnfermariaSerializer = WardBedSerializer
InternamentoEnfermariaSerializer = WardAdmissionSerializer
