from api.core.filters import SafeFilterSet
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


class VeterinaryAnimalFilter(SafeFilterSet):
    class Meta:
        model = VeterinaryAnimal
        fields = ["tenant", "custom_id", "deleted", "species", "breed", "sex", "microchip_number", "owner_name", "status", "created_at"]


class VeterinaryAppointmentFilter(SafeFilterSet):
    class Meta:
        model = VeterinaryAppointment
        fields = ["tenant", "custom_id", "deleted", "animal", "veterinarian", "status", "scheduled_start", "scheduled_end", "created_at"]


class VeterinaryMedicalRecordFilter(SafeFilterSet):
    class Meta:
        model = VeterinaryMedicalRecord
        fields = ["tenant", "custom_id", "deleted", "animal", "veterinarian", "appointment", "status", "opened_at", "closed_at", "created_at"]


class VeterinaryVaccineFilter(SafeFilterSet):
    class Meta:
        model = VeterinaryVaccine
        fields = ["tenant", "custom_id", "deleted", "species", "disease", "manufacturer", "active", "created_at"]


class VeterinaryVaccinationFilter(SafeFilterSet):
    class Meta:
        model = VeterinaryVaccination
        fields = ["tenant", "custom_id", "deleted", "animal", "vaccine", "veterinarian", "status", "scheduled_for", "administered_at", "next_due_date", "created_at"]


class VeterinaryLabExamFilter(SafeFilterSet):
    class Meta:
        model = VeterinaryLabExam
        fields = ["tenant", "custom_id", "deleted", "code", "species", "sample_type", "active", "created_at"]


class VeterinaryLabRequestFilter(SafeFilterSet):
    class Meta:
        model = VeterinaryLabRequest
        fields = ["tenant", "custom_id", "deleted", "animal", "veterinarian", "appointment", "record", "requested_at", "priority", "status", "created_at"]


class VeterinaryLabRequestItemFilter(SafeFilterSet):
    class Meta:
        model = VeterinaryLabRequestItem
        fields = ["tenant", "custom_id", "deleted", "request", "exam", "sample_identifier", "status", "collected_at", "resulted_at", "created_at"]


class VeterinaryAdmissionFilter(SafeFilterSet):
    class Meta:
        model = VeterinaryAdmission
        fields = ["tenant", "custom_id", "deleted", "animal", "veterinarian", "appointment", "status", "ward", "cage", "admitted_at", "discharged_at", "created_at"]


class VeterinaryPrescriptionFilter(SafeFilterSet):
    class Meta:
        model = VeterinaryPrescription
        fields = ["tenant", "custom_id", "deleted", "animal", "record", "veterinarian", "issued_at", "status", "created_at"]


class VeterinaryPrescriptionItemFilter(SafeFilterSet):
    class Meta:
        model = VeterinaryPrescriptionItem
        fields = ["tenant", "custom_id", "deleted", "prescription", "medication", "medication_name", "route", "duration_days", "created_at"]


FILTER_MAP = {
    "animal": VeterinaryAnimalFilter,
    "appointment": VeterinaryAppointmentFilter,
    "record": VeterinaryMedicalRecordFilter,
    "vaccine": VeterinaryVaccineFilter,
    "vaccination": VeterinaryVaccinationFilter,
    "lab_exam": VeterinaryLabExamFilter,
    "lab_request": VeterinaryLabRequestFilter,
    "lab_request_item": VeterinaryLabRequestItemFilter,
    "admission": VeterinaryAdmissionFilter,
    "prescription": VeterinaryPrescriptionFilter,
    "prescription_item": VeterinaryPrescriptionItemFilter,
}
