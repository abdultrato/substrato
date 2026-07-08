"""FilterSets para recursos de Cirurgia na API v1."""

import django_filters
from django.db.models import Q

from api.core.filters import SafeFilterSet
from apps.surgery.models import (
    AnesthesiaRecord,
    LargeSurgery,
    OperatingRoom,
    OperativeReport,
    PreoperativeAssessment,
    RecoveryRecord,
    SmallSurgery,
    Surgery,
    SurgeryProcedureItem,
    SurgicalAuditEvent,
    SurgicalAuthorization,
    SurgicalBillingItem,
    SurgicalConsumption,
    SurgicalDocument,
    SurgicalMaterial,
    SurgicalProcedure,
    SurgicalRequest,
    SurgicalSafetyChecklist,
    SurgicalSchedule,
    SurgicalSpecimen,
    SurgicalTeamMember,
)

BASE_FIELDS = ["tenant", "custom_id", "deleted", "created_at", "updated_at"]


class SurgeryFilter(SafeFilterSet):
    scheduled_date = django_filters.DateFilter(field_name="scheduled_for", lookup_expr="date")

    class Meta:
        model = Surgery
        fields = [
            "patient",
            "surgical_request",
            "specialty",
            "surgeon",
            "operating_room",
            "status",
            "surgery_size",
            "priority",
            "classification",
            "scheduled_for",
            "ward_referral_requested_at",
            "created_at",
        ]


class SmallSurgeryFilter(SafeFilterSet):
    scheduled_date = django_filters.DateFilter(field_name="scheduled_for", lookup_expr="date")

    class Meta:
        model = SmallSurgery
        fields = SurgeryFilter.Meta.fields


class LargeSurgeryFilter(SafeFilterSet):
    scheduled_date = django_filters.DateFilter(field_name="scheduled_for", lookup_expr="date")

    class Meta:
        model = LargeSurgery
        fields = SurgeryFilter.Meta.fields


class SurgicalProcedureFilter(SafeFilterSet):
    for_surgery_size = django_filters.CharFilter(method="filter_for_surgery_size")

    class Meta:
        model = SurgicalProcedure
        fields = ["name", "active", "created_at", "surgery_type"]

    def filter_for_surgery_size(self, queryset, name, value):
        normalized = str(value or "").strip().upper()
        if normalized in {"PEQUENA", "GRANDE"}:
            return queryset.filter(Q(surgery_type=normalized) | Q(surgery_type="AMBAS"))
        if normalized == "AMBAS":
            return queryset.filter(surgery_type="AMBAS")
        return queryset


class SurgicalRequestFilter(SafeFilterSet):
    class Meta:
        model = SurgicalRequest
        fields = [*BASE_FIELDS, "patient", "requesting_doctor", "specialty", "requested_surgery_type", "priority", "status", "created_at"]


class PreoperativeAssessmentFilter(SafeFilterSet):
    class Meta:
        model = PreoperativeAssessment
        fields = [
            *BASE_FIELDS,
            "patient",
            "surgical_request",
            "proposed_surgery",
            "evaluator",
            "asa_class",
            "fit_for_surgery",
            "consent_signed",
            "status",
            "assessed_at",
        ]


class OperatingRoomFilter(SafeFilterSet):
    class Meta:
        model = OperatingRoom
        fields = [*BASE_FIELDS, "code", "room_type", "status", "sterile"]


class SurgicalScheduleFilter(SafeFilterSet):
    class Meta:
        model = SurgicalSchedule
        fields = [
            *BASE_FIELDS,
            "surgery",
            "operating_room",
            "primary_surgeon",
            "anesthetist",
            "status",
            "priority",
            "authorization_verified",
            "scheduled_start",
            "scheduled_end",
        ]


class SurgicalTeamMemberFilter(SafeFilterSet):
    class Meta:
        model = SurgicalTeamMember
        fields = [*BASE_FIELDS, "surgery", "employee", "role", "lead", "present"]


class AnesthesiaRecordFilter(SafeFilterSet):
    class Meta:
        model = AnesthesiaRecord
        fields = [*BASE_FIELDS, "surgery", "anesthetist", "anesthesia_type", "asa_class", "status", "started_at", "ended_at"]


class SurgicalSafetyChecklistFilter(SafeFilterSet):
    class Meta:
        model = SurgicalSafetyChecklist
        fields = [*BASE_FIELDS, "surgery", "completed_by", "phase", "status", "completed_at"]


class SurgicalMaterialFilter(SafeFilterSet):
    class Meta:
        model = SurgicalMaterial
        fields = [
            *BASE_FIELDS,
            "code",
            "internal_code",
            "product",
            "material_type",
            "unit",
            "implantable",
            "sterilizable",
            "tracks_lot",
            "tracks_expiry",
            "reusable",
            "sterile",
            "active",
        ]


class SurgicalConsumptionFilter(SafeFilterSet):
    class Meta:
        model = SurgicalConsumption
        fields = [
            *BASE_FIELDS,
            "surgery",
            "material",
            "product",
            "consumed_by",
            "consumed_at",
            "batch_number",
            "expiry_date",
            "material_status",
            "billing_status",
            "inventory_deducted",
        ]


class RecoveryRecordFilter(SafeFilterSet):
    class Meta:
        model = RecoveryRecord
        fields = [*BASE_FIELDS, "surgery", "nurse", "status", "admitted_at", "discharged_at"]


class OperativeReportFilter(SafeFilterSet):
    class Meta:
        model = OperativeReport
        fields = [*BASE_FIELDS, "surgery", "primary_surgeon", "status", "specimen_sent_to_pathology", "signed_at"]


class SurgeryProcedureItemFilter(SafeFilterSet):
    class Meta:
        model = SurgeryProcedureItem
        fields = [*BASE_FIELDS, "surgery", "procedure", "responsible_surgeon", "status", "laterality", "started_at", "ended_at"]


class SurgicalAuthorizationFilter(SafeFilterSet):
    class Meta:
        model = SurgicalAuthorization
        fields = [
            *BASE_FIELDS,
            "patient",
            "surgery",
            "surgical_request",
            "preoperative_assessment",
            "status",
            "budget_approved",
            "initial_payment_received",
            "insurance_authorized",
            "consent_signed",
            "valid_until",
        ]


class SurgicalBillingItemFilter(SafeFilterSet):
    class Meta:
        model = SurgicalBillingItem
        fields = [*BASE_FIELDS, "surgery", "authorization", "procedure_item", "consumption", "invoice", "event_type", "billing_mode", "status", "billable"]


class SurgicalDocumentFilter(SafeFilterSet):
    class Meta:
        model = SurgicalDocument
        fields = [*BASE_FIELDS, "surgery", "surgical_request", "preoperative_assessment", "authorization", "document_type", "status", "signed_at", "expires_at"]


class SurgicalAuditEventFilter(SafeFilterSet):
    class Meta:
        model = SurgicalAuditEvent
        fields = [*BASE_FIELDS, "surgery", "surgical_request", "actor", "event_type", "occurred_at"]


class SurgicalSpecimenFilter(SafeFilterSet):
    class Meta:
        model = SurgicalSpecimen
        fields = [*BASE_FIELDS, "surgery", "patient", "responsible", "pathology_request", "specimen_type", "status", "collected_at"]


FILTER_MAP = {
    "pedido_cirurgico": SurgicalRequestFilter,
    "avaliacao_pre_operatoria": PreoperativeAssessmentFilter,
    "surgery": SurgeryFilter,
    "small_surgery": SmallSurgeryFilter,
    "large_surgery": LargeSurgeryFilter,
    "surgical_procedure": SurgicalProcedureFilter,
    "procedimentos_realizados": SurgeryProcedureItemFilter,
    "agenda_cirurgica": SurgicalScheduleFilter,
    "centro_cirurgico": OperatingRoomFilter,
    "equipa_cirurgica": SurgicalTeamMemberFilter,
    "anestesia": AnesthesiaRecordFilter,
    "checklist_seguranca": SurgicalSafetyChecklistFilter,
    "materiais": SurgicalMaterialFilter,
    "consumos": SurgicalConsumptionFilter,
    "recuperacao": RecoveryRecordFilter,
    "relatorio_operatorio": OperativeReportFilter,
    "autorizacoes": SurgicalAuthorizationFilter,
    "faturacao": SurgicalBillingItemFilter,
    "documentos": SurgicalDocumentFilter,
    "auditoria": SurgicalAuditEventFilter,
    "amostras": SurgicalSpecimenFilter,
}
