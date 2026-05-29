from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.veterinary.models import (
    VeterinaryAdmission,
    VeterinaryAnimal,
    VeterinaryAppointment,
    VeterinaryLabExam,
    VeterinaryLabRequest,
    VeterinaryLabRequestItem,
    VeterinaryMedicalRecord,
    VeterinaryPrescription,
    VeterinaryPrescriptionItem,
    VeterinaryVaccination,
    VeterinaryVaccine,
)

from .filters import (
    VeterinaryAdmissionFilter,
    VeterinaryAnimalFilter,
    VeterinaryAppointmentFilter,
    VeterinaryLabExamFilter,
    VeterinaryLabRequestFilter,
    VeterinaryLabRequestItemFilter,
    VeterinaryMedicalRecordFilter,
    VeterinaryPrescriptionFilter,
    VeterinaryPrescriptionItemFilter,
    VeterinaryVaccinationFilter,
    VeterinaryVaccineFilter,
)
from .serializers import (
    VeterinaryAdmissionSerializer,
    VeterinaryAnimalSerializer,
    VeterinaryAppointmentSerializer,
    VeterinaryLabExamSerializer,
    VeterinaryLabRequestItemSerializer,
    VeterinaryLabRequestSerializer,
    VeterinaryMedicalRecordSerializer,
    VeterinaryPrescriptionItemSerializer,
    VeterinaryPrescriptionSerializer,
    VeterinaryVaccinationSerializer,
    VeterinaryVaccineSerializer,
)


class VeterinaryAnimalViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryAnimal.objects.all()
    serializer_class = VeterinaryAnimalSerializer
    filterset_class = VeterinaryAnimalFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "breed", "microchip_number", "owner_name", "owner_phone", "owner_email", "notes"]
    ordering_fields = ["name", "species", "breed", "sex", "owner_name", "status", "birth_date", "created_at"]
    ordering = ["name", "owner_name"]


class VeterinaryAppointmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryAppointment.objects.select_related("animal", "veterinarian").all()
    serializer_class = VeterinaryAppointmentSerializer
    filterset_class = VeterinaryAppointmentFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "reason", "room", "notes"]
    ordering_fields = ["scheduled_start", "scheduled_end", "status", "animal", "veterinarian", "created_at"]
    ordering = ["-scheduled_start", "-created_at"]


class VeterinaryMedicalRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryMedicalRecord.objects.select_related("animal", "veterinarian", "appointment").all()
    serializer_class = VeterinaryMedicalRecordSerializer
    filterset_class = VeterinaryMedicalRecordFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "animal__name",
        "animal__owner_name",
        "veterinarian__name",
        "anamnesis",
        "symptoms",
        "diagnosis",
        "treatment_plan",
        "prescription_notes",
    ]
    ordering_fields = ["opened_at", "closed_at", "status", "animal", "veterinarian", "created_at"]
    ordering = ["-opened_at", "-created_at"]


class VeterinaryVaccineViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryVaccine.objects.all()
    serializer_class = VeterinaryVaccineSerializer
    filterset_class = VeterinaryVaccineFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "species", "disease", "manufacturer", "notes"]
    ordering_fields = ["name", "species", "disease", "manufacturer", "active", "created_at"]
    ordering = ["name", "species"]


class VeterinaryVaccinationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryVaccination.objects.select_related("animal", "vaccine", "veterinarian").all()
    serializer_class = VeterinaryVaccinationSerializer
    filterset_class = VeterinaryVaccinationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "animal__name", "animal__owner_name", "vaccine__name", "vaccine__disease", "lot_number", "notes"]
    ordering_fields = ["scheduled_for", "administered_at", "next_due_date", "status", "animal", "vaccine", "created_at"]
    ordering = ["-administered_at", "-scheduled_for", "-created_at"]


class VeterinaryLabExamViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryLabExam.objects.all()
    serializer_class = VeterinaryLabExamSerializer
    filterset_class = VeterinaryLabExamFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "code", "name", "species", "sample_type", "notes"]
    ordering_fields = ["code", "name", "species", "sample_type", "turnaround_hours", "active", "created_at"]
    ordering = ["name", "code"]


class VeterinaryLabRequestViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryLabRequest.objects.select_related(
        "animal",
        "veterinarian",
        "appointment",
        "record",
    ).prefetch_related("items").all()
    serializer_class = VeterinaryLabRequestSerializer
    filterset_class = VeterinaryLabRequestFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "clinical_notes", "notes"]
    ordering_fields = ["requested_at", "priority", "status", "animal", "veterinarian", "created_at"]
    ordering = ["-requested_at", "-created_at"]


class VeterinaryLabRequestItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryLabRequestItem.objects.select_related("request", "request__animal", "exam").all()
    serializer_class = VeterinaryLabRequestItemSerializer
    filterset_class = VeterinaryLabRequestItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "request__custom_id",
        "request__animal__name",
        "exam__name",
        "exam__code",
        "sample_identifier",
        "result_summary",
        "result_value",
    ]
    ordering_fields = ["position", "status", "collected_at", "resulted_at", "request", "exam", "created_at"]
    ordering = ["request", "position", "id"]


class VeterinaryAdmissionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryAdmission.objects.select_related("animal", "veterinarian", "appointment").all()
    serializer_class = VeterinaryAdmissionSerializer
    filterset_class = VeterinaryAdmissionFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "ward", "cage", "reason", "diagnosis"]
    ordering_fields = ["admitted_at", "discharged_at", "status", "ward", "cage", "animal", "veterinarian", "created_at"]
    ordering = ["-admitted_at", "-created_at"]


class VeterinaryPrescriptionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryPrescription.objects.select_related("animal", "record", "veterinarian").prefetch_related("items").all()
    serializer_class = VeterinaryPrescriptionSerializer
    filterset_class = VeterinaryPrescriptionFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "instructions", "notes"]
    ordering_fields = ["issued_at", "status", "animal", "veterinarian", "created_at"]
    ordering = ["-issued_at", "-created_at"]


class VeterinaryPrescriptionItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryPrescriptionItem.objects.select_related("prescription", "prescription__animal", "medication").all()
    serializer_class = VeterinaryPrescriptionItemSerializer
    filterset_class = VeterinaryPrescriptionItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "prescription__custom_id", "prescription__animal__name", "medication__name", "medication_name", "dosage"]
    ordering_fields = ["position", "route", "duration_days", "quantity", "prescription", "medication", "created_at"]
    ordering = ["prescription", "position", "id"]


VIEWSET_MAP = {
    "animal": VeterinaryAnimalViewSet,
    "appointment": VeterinaryAppointmentViewSet,
    "record": VeterinaryMedicalRecordViewSet,
    "vaccine": VeterinaryVaccineViewSet,
    "vaccination": VeterinaryVaccinationViewSet,
    "lab_exam": VeterinaryLabExamViewSet,
    "lab_request": VeterinaryLabRequestViewSet,
    "lab_request_item": VeterinaryLabRequestItemViewSet,
    "admission": VeterinaryAdmissionViewSet,
    "prescription": VeterinaryPrescriptionViewSet,
    "prescription_item": VeterinaryPrescriptionItemViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "VeterinaryAdmissionViewSet",
    "VeterinaryAnimalViewSet",
    "VeterinaryAppointmentViewSet",
    "VeterinaryLabExamViewSet",
    "VeterinaryLabRequestItemViewSet",
    "VeterinaryLabRequestViewSet",
    "VeterinaryMedicalRecordViewSet",
    "VeterinaryPrescriptionItemViewSet",
    "VeterinaryPrescriptionViewSet",
    "VeterinaryVaccinationViewSet",
    "VeterinaryVaccineViewSet",
]
