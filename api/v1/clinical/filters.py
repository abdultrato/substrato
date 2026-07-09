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
            "sample_options",
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
    is_blood_donor = django_filters.BooleanFilter(
        method="filter_is_blood_donor",
        label="É doador de sangue (possui doações registadas)",
    )
    legacy_filter_aliases = {
        "contacto": "contact",
        "data_nascimento": "birth_date",
        "doador_sangue": "is_blood_donor",
        "genero": "gender",
        "morada": "address",
        "nome": "name",
        "numero_id": "document_number",
        "proveniencia": "provenance",
        "raca_origem": "race_origin",
        "tipo_documento": "document_type",
    }

    def filter_is_blood_donor(self, queryset, name, value):
        # "Doador" = paciente com pelo menos uma doação de sangue não eliminada.
        if value is None:
            return queryset
        donors = queryset.filter(blood_donations__deleted=False)
        donors = [patient.pk for patient in donors.distinct() if patient.apto_como_doador_de_sangue_por_idade()]
        if value:
            return queryset.filter(pk__in=donors)
        return queryset.exclude(pk__in=donors)

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
    # Fluxo de colheita: ?validada=true|false e ?colhida=true|false
    validada = django_filters.BooleanFilter(field_name="validated_at", lookup_expr="isnull", exclude=True)
    colhida = django_filters.BooleanFilter(field_name="collected_at", lookup_expr="isnull", exclude=True)
    # Fila do laboratório: ?fase=rececao_amostras|pedidos|trabalho|recolheita
    fase = django_filters.CharFilter(method="filter_fase")
    # Intervalo de validação
    validated_from = django_filters.DateFilter(field_name="updated_at", lookup_expr="date__gte")
    validated_to = django_filters.DateFilter(field_name="updated_at", lookup_expr="date__lte")
    # Pesquisa por dados do paciente
    patient_name = django_filters.CharFilter(field_name="patient__name", lookup_expr="icontains")
    patient_document = django_filters.CharFilter(field_name="patient__document_number", lookup_expr="icontains")
    patient_birth_date = django_filters.DateFilter(field_name="patient__birth_date")
    patient_gender = django_filters.CharFilter(method="filter_patient_gender")
    # Médico solicitante e exame (nome do exame laboratorial OU médico).
    physician = django_filters.CharFilter(field_name="requesting_physician__name", lookup_expr="icontains")
    exam = django_filters.CharFilter(method="filter_exam")

    def filter_patient_gender(self, queryset, name, value):
        v = (value or "").strip().upper()
        if v.startswith("M"):
            return queryset.filter(patient__gender__istartswith="M")
        if v.startswith("F"):
            return queryset.filter(patient__gender__istartswith="F")
        return queryset

    def filter_exam(self, queryset, name, value):
        from django.db.models import Q

        value = (value or "").strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(items__deleted=False)
            & (
                Q(items__exam__name__icontains=value)
                | Q(items__medical_exam__name__icontains=value)
            )
        ).distinct()

    def filter_fase(self, queryset, name, value):
        from apps.clinical.models.lab_request_item import LabRequestItem
        from domain.clinical.result_state import ResultState

        fase = (value or "").strip().lower()
        awaiting = LabRequestItem.SampleStatus.AWAITING
        collected = LabRequestItem.SampleStatus.COLLECTED
        rejected = LabRequestItem.SampleStatus.REJECTED

        if fase in {"rececao_amostras", "recepcao_amostras"}:
            return (
                queryset.filter(status=ResultState.PENDING, collected_at__isnull=False)
                .filter(items__deleted=False, items__sample_status=collected)
                .distinct()
            )
        if fase == "pedidos":
            return (
                queryset.filter(status=ResultState.PENDING)
                .exclude(items__deleted=False, items__sample_status__in=[awaiting, collected, rejected])
                .filter(items__deleted=False, items__exam__isnull=False)
                .distinct()
            )
        if fase == "trabalho":
            # Em processamento OU com resultados gravados a aguardar validação —
            # a requisição só sai da lista de trabalho depois de validada.
            return queryset.filter(
                status__in=[ResultState.IN_ANALYSIS, ResultState.AWAITING_VALIDATION]
            )
        if fase == "laudos":
            return queryset.filter(status=ResultState.VALIDATED)
        if fase in {"recolheita", "repetir_colheita"}:
            return queryset.filter(items__deleted=False, items__sample_status=rejected).distinct()
        return queryset

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
    legacy_filter_aliases = {}

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
            "disregarded_by",
            "disregarded_at",
            "disregard_validated_by",
            "disregard_validation_date",
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
