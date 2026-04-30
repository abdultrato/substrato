"""FilterSets para recursos de Enfermagem na API v1."""

from api.core.filters import SafeFilterSet
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


class NursingRecordFilter(SafeFilterSet):
    class Meta:
        model = NursingRecord
        fields = [
            "tenant",
            "custom_id",
            "name",
            "patient",
            "priority",
            "record_date",
            "created_at",
            "updated_at",
            "deleted",
        ]


class ProcedureCatalogFilter(SafeFilterSet):
    class Meta:
        model = ProcedureCatalog
        fields = [
            "tenant",
            "custom_id",
            "name",
            "procedure_code",
            "estimated_duration_minutes",
            "active",
            "default_price",
            "created_at",
            "updated_at",
            "deleted",
        ]


class ProcedureCatalogMaterialFilter(SafeFilterSet):
    class Meta:
        model = ProcedureCatalogMaterial
        fields = [
            "tenant",
            "custom_id",
            "catalog",
            "product",
            "default_quantity",
            "default_unit_cost",
            "created_at",
            "updated_at",
            "deleted",
        ]


class ProcedureFilter(SafeFilterSet):
    class Meta:
        model = Procedure
        fields = [
            "tenant",
            "custom_id",
            "patient",
            "professional",
            "workflow_status",
            "billing_status",
            "performed_date",
            "billed_at",
            "executed_at",
            "completed_at",
            "created_at",
            "updated_at",
            "deleted",
        ]


class ProcedureItemFilter(SafeFilterSet):
    class Meta:
        model = ProcedureItem
        fields = [
            "tenant",
            "custom_id",
            "position",
            "procedure",
            "catalog",
            "description",
            "quantity",
            "performed",
            "execution_status",
            "billed",
            "billed_at",
            "executed_at",
            "completed_at",
            "created_at",
            "updated_at",
            "deleted",
        ]


class ProcedureMaterialFilter(SafeFilterSet):
    class Meta:
        model = ProcedureMaterial
        fields = [
            "tenant",
            "custom_id",
            "position",
            "procedure",
            "procedure_item",
            "product",
            "lot",
            "quantity",
            "inventory_movement",
            "created_at",
            "updated_at",
            "deleted",
        ]


class ProcedureItemValueFilter(SafeFilterSet):
    class Meta:
        model = ProcedureItemValue
        fields = [
            "tenant",
            "custom_id",
            "item",
            "unit_price",
            "created_at",
            "updated_at",
            "deleted",
        ]


class ProcedureMaterialValueFilter(SafeFilterSet):
    class Meta:
        model = ProcedureMaterialValue
        fields = [
            "tenant",
            "custom_id",
            "material",
            "unit_cost",
            "created_at",
            "updated_at",
            "deleted",
        ]


class NursingVitalSignFilter(SafeFilterSet):
    class Meta:
        model = NursingVitalSign
        fields = [
            "tenant",
            "custom_id",
            "name",
            "record",
            "temperature_c",
            "heart_rate",
            "respiratory_rate",
            "oxygen_saturation",
            "collected_at",
            "created_at",
            "updated_at",
            "deleted",
        ]


class NursingPrescriptionFilter(SafeFilterSet):
    class Meta:
        model = NursingPrescription
        fields = [
            "tenant",
            "custom_id",
            "name",
            "patient",
            "active",
            "prescription_date",
            "created_at",
            "updated_at",
            "deleted",
        ]


class NursingEvolutionFilter(SafeFilterSet):
    class Meta:
        model = NursingEvolution
        fields = [
            "tenant",
            "custom_id",
            "name",
            "patient",
            "evolution_date",
            "created_at",
            "updated_at",
            "deleted",
        ]


class WardFilter(SafeFilterSet):
    class Meta:
        model = Ward
        fields = [
            "tenant",
            "custom_id",
            "name",
            "active",
            "created_at",
            "updated_at",
            "deleted",
        ]


class WardBedFilter(SafeFilterSet):
    class Meta:
        model = WardBed
        fields = [
            "tenant",
            "custom_id",
            "ward",
            "number",
            "active",
            "created_at",
            "updated_at",
            "deleted",
        ]


class WardAdmissionFilter(SafeFilterSet):
    class Meta:
        model = WardAdmission
        fields = [
            "tenant",
            "custom_id",
            "bed",
            "patient",
            "active",
            "admission_date",
            "expected_discharge_date",
            "discharged_at",
            "next_medication_at",
            "created_at",
            "updated_at",
            "deleted",
        ]


FILTER_MAP = {
    "evolucaoenfermagem": NursingEvolutionFilter,
    "procedimentocatalogo": ProcedureCatalogFilter,
    "procedimentocatalogomaterial": ProcedureCatalogMaterialFilter,
    "procedure": ProcedureFilter,
    "procedimentoitem": ProcedureItemFilter,
    "procedimentoitemvalor": ProcedureItemValueFilter,
    "procedimentomaterial": ProcedureMaterialFilter,
    "procedimentomaterialvalor": ProcedureMaterialValueFilter,
    "prescricaoenfermagem": NursingPrescriptionFilter,
    "registroenfermagem": NursingRecordFilter,
    "sinalvitalenfermagem": NursingVitalSignFilter,
    "ward": WardFilter,
    "camaenfermaria": WardBedFilter,
    "internamentoenfermaria": WardAdmissionFilter,
}

