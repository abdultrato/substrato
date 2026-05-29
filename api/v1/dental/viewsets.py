from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.dental.models import (
    DentalAppointment,
    DentalOdontogramEntry,
    DentalProcedure,
    DentalProsthesisLabOrder,
    DentalRecord,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
)

from .filters import (
    DentalAppointmentFilter,
    DentalOdontogramEntryFilter,
    DentalProcedureFilter,
    DentalProsthesisLabOrderFilter,
    DentalRecordFilter,
    DentalTreatmentPlanFilter,
    DentalTreatmentPlanItemFilter,
)
from .serializers import (
    DentalAppointmentSerializer,
    DentalOdontogramEntrySerializer,
    DentalProcedureSerializer,
    DentalProsthesisLabOrderSerializer,
    DentalRecordSerializer,
    DentalTreatmentPlanItemSerializer,
    DentalTreatmentPlanSerializer,
)


class DentalProcedureViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalProcedure.objects.all()
    serializer_class = DentalProcedureSerializer
    filterset_class = DentalProcedureFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "code", "name", "category", "notes"]
    ordering_fields = ["code", "name", "category", "base_price", "default_duration_minutes", "active", "created_at"]
    ordering = ["name", "code"]


class DentalAppointmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalAppointment.objects.select_related("patient", "dentist", "consultation").all()
    serializer_class = DentalAppointmentSerializer
    filterset_class = DentalAppointmentFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "patient__name", "patient__document_number", "dentist__name", "reason", "chair", "notes"]
    ordering_fields = ["scheduled_start", "scheduled_end", "status", "patient", "dentist", "created_at"]
    ordering = ["-scheduled_start", "-created_at"]


class DentalRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalRecord.objects.select_related("patient", "dentist", "appointment").prefetch_related("odontogram_entries").all()
    serializer_class = DentalRecordSerializer
    filterset_class = DentalRecordFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "dentist__name",
        "chief_complaint",
        "dental_history",
        "diagnosis",
        "treatment_summary",
        "notes",
    ]
    ordering_fields = ["opened_at", "closed_at", "status", "patient", "dentist", "created_at"]
    ordering = ["-opened_at", "-created_at"]


class DentalOdontogramEntryViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalOdontogramEntry.objects.select_related("record", "record__patient", "procedure").all()
    serializer_class = DentalOdontogramEntrySerializer
    filterset_class = DentalOdontogramEntryFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "record__custom_id", "record__patient__name", "tooth_number", "condition", "notes"]
    ordering_fields = ["record", "tooth_number", "surface", "condition", "created_at"]
    ordering = ["record", "tooth_number", "surface", "id"]


class DentalTreatmentPlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalTreatmentPlan.objects.select_related("patient", "dentist", "record").prefetch_related("items").all()
    serializer_class = DentalTreatmentPlanSerializer
    filterset_class = DentalTreatmentPlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "title", "patient__name", "dentist__name", "objectives", "notes"]
    ordering_fields = ["planned_start", "planned_end", "status", "estimated_total", "patient", "dentist", "created_at"]
    ordering = ["-created_at"]


class DentalTreatmentPlanItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalTreatmentPlanItem.objects.select_related(
        "treatment_plan",
        "treatment_plan__patient",
        "procedure",
        "appointment",
    ).all()
    serializer_class = DentalTreatmentPlanItemSerializer
    filterset_class = DentalTreatmentPlanItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "treatment_plan__title", "procedure__name", "tooth_number", "clinical_notes"]
    ordering_fields = ["position", "scheduled_date", "completed_at", "status", "quantity", "unit_price", "created_at"]
    ordering = ["treatment_plan", "position", "id"]


class DentalProsthesisLabOrderViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalProsthesisLabOrder.objects.select_related(
        "patient",
        "dentist",
        "treatment_item",
        "lab_company",
    ).all()
    serializer_class = DentalProsthesisLabOrderSerializer
    filterset_class = DentalProsthesisLabOrderFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "order_number",
        "patient__name",
        "dentist__name",
        "lab_company__name",
        "tooth_numbers",
        "shade",
        "material",
        "lab_notes",
    ]
    ordering_fields = ["created_at", "due_date", "sent_at", "received_at", "delivered_at", "status", "cost"]
    ordering = ["-created_at"]


VIEWSET_MAP = {
    "procedure": DentalProcedureViewSet,
    "appointment": DentalAppointmentViewSet,
    "record": DentalRecordViewSet,
    "odontogram": DentalOdontogramEntryViewSet,
    "treatment_plan": DentalTreatmentPlanViewSet,
    "treatment_item": DentalTreatmentPlanItemViewSet,
    "prosthesis_lab_order": DentalProsthesisLabOrderViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DentalAppointmentViewSet",
    "DentalOdontogramEntryViewSet",
    "DentalProcedureViewSet",
    "DentalProsthesisLabOrderViewSet",
    "DentalRecordViewSet",
    "DentalTreatmentPlanItemViewSet",
    "DentalTreatmentPlanViewSet",
]
