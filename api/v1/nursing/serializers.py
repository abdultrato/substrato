"""Serializers DRF para recursos de Enfermagem na API v1."""

from rest_framework import serializers

from apps.nursing.models import (
    NursingEvolution,
    NursingPrescription,
    NursingRecord,
    NursingVitalSign,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    ProcedureItemValue,
    ProcedureMaterial,
    ProcedureMaterialValue,
    Ward,
    WardAdmission,
    WardBed,
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
        extra_kwargs = {
            "default_unit_cost": {"read_only": True},
        }


class ProcedureSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    professional_name = serializers.SerializerMethodField()
    professional_names = serializers.SerializerMethodField()
    workflow_status_display = serializers.CharField(source="get_workflow_status_display", read_only=True)
    billing_status_display = serializers.CharField(source="get_billing_status_display", read_only=True)
    items_count = serializers.IntegerField(source="itens.count", read_only=True)

    def _professional_names(self, obj):
        names = []
        for professional in obj.professional.all():
            full_name = ""
            if hasattr(professional, "get_full_name"):
                full_name = (professional.get_full_name() or "").strip()
            if not full_name:
                full_name = getattr(professional, "name", "") or getattr(professional, "username", "")
            names.append(full_name or str(professional.pk))
        return names

    def get_professional_names(self, obj):
        return self._professional_names(obj)

    def get_professional_name(self, obj):
        names = self._professional_names(obj)
        if not names:
            return ""
        return ", ".join(names)

    class Meta:
        model = Procedure
        fields = "__all__"


class ProcedureItemSerializer(serializers.ModelSerializer):
    value_unitario = serializers.DecimalField(
        source="value.unit_price",
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    catalog_name = serializers.CharField(source="catalog.name", read_only=True)
    catalog_code = serializers.CharField(source="catalog.procedure_code", read_only=True)
    execution_status_display = serializers.CharField(source="get_execution_status_display", read_only=True)
    patient_name = serializers.CharField(source="procedure.patient.name", read_only=True)

    class Meta:
        model = ProcedureItem
        exclude = ("unit_price",)


class ProcedureMaterialSerializer(serializers.ModelSerializer):
    value_unitario = serializers.DecimalField(
        source="value.unit_cost",
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ProcedureMaterial
        exclude = ("unit_cost",)


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
    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = WardBed
        fields = "__all__"


class WardAdmissionSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    bed_number = serializers.CharField(source="bed.number", read_only=True)
    ward_name = serializers.CharField(source="bed.ward.name", read_only=True)

    class Meta:
        model = WardAdmission
        fields = "__all__"


SERIALIZER_MAP = {
    "evolucaoenfermagem": NursingEvolutionSerializer,
    "procedimentocatalogo": ProcedureCatalogSerializer,
    "procedimentocatalogomaterial": ProcedureCatalogMaterialSerializer,
    "procedure": ProcedureSerializer,
    "procedimentoitem": ProcedureItemSerializer,
    "procedimentoitemvalor": ProcedureItemValueSerializer,
    "procedimentomaterial": ProcedureMaterialSerializer,
    "procedimentomaterialvalor": ProcedureMaterialValueSerializer,
    "prescricaoenfermagem": NursingPrescriptionSerializer,
    "registroenfermagem": NursingRecordSerializer,
    "sinalvitalenfermagem": NursingVitalSignSerializer,
    "ward": WardSerializer,
    "camaenfermaria": WardBedSerializer,
    "internamentoenfermaria": WardAdmissionSerializer,
}
