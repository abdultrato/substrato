import django_filters

from api.core.filters import SafeFilterSet
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.medical_exam import MedicalExam, MedicalExamField
from apps.clinical.models.medical_result_file import MedicalResultFile
from apps.clinical.models.patient import Patient
from apps.clinical.models.result_item import ResultItem
from apps.clinical.models.sample import Sample

# =====================================================
# EXAMS
# =====================================================


class SampleFilter(SafeFilterSet):
    legacy_filter_aliases = {
        "nome": "name",
    }

    class Meta:
        model = Sample
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "name",
            "bottle_type",
            "cap_color",
            "minimum_volume_ml",
            "fasting_required",
            "fasting_hours",
            "storage_temperature",
            "stability_hours",
            "anticoagulant",
        ]


class LabExamFilter(SafeFilterSet):
    legacy_filter_aliases = {}

    class Meta:
        model = LabExam
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "name",
            "turnaround_hours",
            "price",
            "method",
            "sector",
            "sample_type",
        ]


class MedicalExamFilter(SafeFilterSet):
    class Meta:
        model = MedicalExam
        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "name",
            "turnaround_hours",
            "price",
            "method",
            "sector",
        ]


# =====================================================
# EXAM FIELDS
# =====================================================


class LabExamFieldFilter(SafeFilterSet):
    legacy_filter_aliases = {
        "exame": "exam",
        "nome": "name",
        "tipo": "type",
        "unidade": "unit",
    }

    class Meta:
        model = LabExamField
        fields = [
            "tenant",
            "custom_id",
            "position",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "exam",
            "name",
            "type",
            "unit",
        ]


class MedicalExamFieldFilter(SafeFilterSet):
    legacy_filter_aliases = {
        "exame": "exam",
        "nome": "name",
        "tipo": "type",
    }

    class Meta:
        model = MedicalExamField
        fields = [
            "tenant",
            "custom_id",
            "position",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "exam",
            "name",
            "type",
        ]


# =====================================================
# PATIENTS
# =====================================================


class PatientFilter(SafeFilterSet):
    address = django_filters.CharFilter(field_name="address", lookup_expr="icontains")
    legacy_filter_aliases = {
        "contacto": "contact",
        "data_nascimento": "birth_date",
        "genero": "gender",
        "morada": "address",
        "nome": "name",
        "numero_id": "document_number",
        "proveniencia": "provenance",
        "raca_origem": "race_origin",
        "tipo_documento": "document_type",
    }

    class Meta:
        model = Patient

        fields = [
            "tenant",
            "custom_id",
            "deleted",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "name",
            "birth_date",
            "gender",
            "race_origin",
            "document_type",
            "document_number",
            "address",
            "contact",
            "email",
            "provenance",
        ]


# =====================================================
# REQUESTS
# =====================================================


class LabRequestFilter(SafeFilterSet):
    legacy_filter_aliases = {
        "analista": "analyst",
        "estado": "status",
        "paciente": "patient",
        "status_clinico": "clinical_status",
        "tipo": "type",
    }

    class Meta:
        model = LabRequest
        fields = [
            "tenant",
            "custom_id",
            "position",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "patient",
            "analyst",
            "type",
            "status",
            "clinical_status",
            "has_critical_result",
            "requires_fasting",
            "fasting_hours",
        ]


# =====================================================
# REQUEST ITEMS
# =====================================================


class LabRequestItemFilter(SafeFilterSet):
    legacy_filter_aliases = {
        "exame": "exam",
        "exame_medico": "medical_exam",
        "requisicao": "request",
    }

    class Meta:
        model = LabRequestItem
        fields = [
            "tenant",
            "custom_id",
            "position",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "request",
            "exam",
            "medical_exam",
        ]


# =====================================================
# RESULTS
# =====================================================


class ResultItemFilter(SafeFilterSet):
    legacy_filter_aliases = {
        "campo_exame": "exam_field",
        "data_validacao": "validation_date",
        "estado": "status",
        "requisicao": "request",
        "status_clinico": "clinical_status",
        "validado_por": "validated_by",
    }

    class Meta:
        model = ResultItem
        fields = [
            "tenant",
            "custom_id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "request",
            "exam_field",
            "result",
            "clinical_status",
            "report_color",
            "critical_alert",
            "status",
            "validated_by",
            "validation_date",
        ]


class MedicalResultFileFilter(SafeFilterSet):
    legacy_filter_aliases = {
        "exame_medico": "medical_exam",
        "item_requisicao": "request_item",
        "requisicao": "request",
        "resultado": "result",
        "tipo": "type",
    }

    class Meta:
        model = MedicalResultFile
        fields = [
            "tenant",
            "custom_id",
            "created_at",
            "updated_at",
            "request",
            "medical_exam",
            "result",
            "request_item",
            "type",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "sample": SampleFilter,
    "exam": LabExamFilter,
    "examemedico": MedicalExamFilter,
    "examecampo": LabExamFieldFilter,
    "examemedicocampo": MedicalExamFieldFilter,
    "patient": PatientFilter,
    "requisicaoanalise": LabRequestFilter,
    "requisicaoitem": LabRequestItemFilter,
    "resultadoitem": ResultItemFilter,
    "resultadomedicoarquivo": MedicalResultFileFilter,
}

# Backwards-compatible aliases while callers are migrated incrementally.
