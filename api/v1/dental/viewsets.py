from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.dental.models import (
    DentalAppointment,
    DentalOdontogramEntry,
    DentalPatientTreatmentPlan,
    DentalProcedure,
    DentalProsthesisLabOrder,
    DentalRecord,
    DentalTreatmentPlan,
    DentalTreatmentPlanItem,
)

from .filters import (
    DentalAppointmentFilter,
    DentalOdontogramEntryFilter,
    DentalPatientTreatmentPlanFilter,
    DentalProcedureFilter,
    DentalProsthesisLabOrderFilter,
    DentalRecordFilter,
    DentalTreatmentPlanFilter,
    DentalTreatmentPlanItemFilter,
)
from .serializers import (
    DentalAppointmentSerializer,
    DentalOdontogramEntrySerializer,
    DentalPatientTreatmentPlanSerializer,
    DentalProcedureSerializer,
    DentalProsthesisLabOrderSerializer,
    DentalRecordSerializer,
    DentalTreatmentPlanItemSerializer,
    DentalTreatmentPlanSerializer,
)


def _filter_patient_plan_validity(queryset, validity: str):
    today = timezone.localdate()
    normalized = (validity or "").strip().lower()
    if normalized in {"valid", "validos", "válidos", "valido", "válido"}:
        return queryset.filter(
            status=DentalPatientTreatmentPlan.Status.ACTIVE,
            valid_from__lte=today,
        ).filter(Q(valid_until__isnull=True) | Q(valid_until__gte=today))
    if normalized in {"expired", "expirados", "expirado"}:
        return queryset.filter(Q(status=DentalPatientTreatmentPlan.Status.EXPIRED) | Q(valid_until__lt=today))
    return queryset


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
    queryset = DentalTreatmentPlan.objects.select_related("patient", "dentist", "record").prefetch_related(
        "items",
        "patient_assignments",
    ).all()
    serializer_class = DentalTreatmentPlanSerializer
    filterset_class = DentalTreatmentPlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "title", "patient__name", "dentist__name", "objectives", "notes"]
    ordering_fields = ["planned_start", "planned_end", "status", "estimated_total", "patient", "dentist", "created_at"]
    ordering = ["-created_at"]


class DentalTreatmentPlanItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalTreatmentPlanItem.objects.select_related(
        "treatment_plan",
        "procedure",
        "appointment",
    ).all()
    serializer_class = DentalTreatmentPlanItemSerializer
    filterset_class = DentalTreatmentPlanItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "treatment_plan__title", "procedure__name", "tooth_number", "clinical_notes"]
    ordering_fields = ["position", "scheduled_date", "completed_at", "status", "quantity", "unit_price", "created_at"]
    ordering = ["treatment_plan", "position", "id"]


class DentalPatientTreatmentPlanViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DentalPatientTreatmentPlan.objects.select_related(
        "patient",
        "treatment_plan",
        "dentist",
        "record",
    ).prefetch_related("treatment_plan__items").all()
    serializer_class = DentalPatientTreatmentPlanSerializer
    filterset_class = DentalPatientTreatmentPlanFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "patient__name",
        "patient__document_number",
        "treatment_plan__title",
        "dentist__name",
        "notes",
    ]
    ordering_fields = [
        "assigned_at",
        "valid_from",
        "valid_until",
        "status",
        "patient",
        "treatment_plan",
        "dentist",
        "created_at",
    ]
    ordering = ["-valid_from", "-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        request = getattr(self, "request", None)
        validity = ""
        if request is not None:
            validity = request.query_params.get("validity", "")
        return _filter_patient_plan_validity(queryset, validity)

    @action(detail=False, methods=["get"], url_path="valid", url_name="valid")
    def valid(self, request):
        queryset = self.filter_queryset(_filter_patient_plan_validity(super().get_queryset(), "valid"))
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(queryset, many=True).data)

    @action(detail=False, methods=["get"], url_path="expired", url_name="expired")
    def expired(self, request):
        queryset = self.filter_queryset(_filter_patient_plan_validity(super().get_queryset(), "expired"))
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(queryset, many=True).data)


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
    "patient_treatment_plan": DentalPatientTreatmentPlanViewSet,
    "prosthesis_lab_order": DentalProsthesisLabOrderViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DentalAppointmentViewSet",
    "DentalOdontogramEntryViewSet",
    "DentalPatientTreatmentPlanViewSet",
    "DentalProcedureViewSet",
    "DentalProsthesisLabOrderViewSet",
    "DentalRecordViewSet",
    "DentalTreatmentPlanItemViewSet",
    "DentalTreatmentPlanViewSet",
]
