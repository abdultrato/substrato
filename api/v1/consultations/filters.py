from api.core.filters import SafeFilterSet
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.human_resources.models.employee import Employee


class MedicalConsultationFilter(SafeFilterSet):
    class Meta:
        model = MedicalConsultation
        fields = [
            "patient",
            "doctor",
            "type",
            "status",
            "schedule_type",
            "manual_holiday",
            "scheduled_for",
            "created_at",
        ]


class DoctorFilter(SafeFilterSet):
    class Meta:
        model = Employee
        fields = ["name", "profession", "role", "status", "created_at"]


class ConsultationSpecialtyFilter(SafeFilterSet):
    class Meta:
        model = ConsultationSpecialty
        fields = ["name", "active", "base_price"]


class HolidayFilter(SafeFilterSet):
    class Meta:
        model = Holiday
        fields = ["date", "active"]


FILTER_MAP = {
    "consultation": MedicalConsultationFilter,
    "medicos": DoctorFilter,
    "specialty": ConsultationSpecialtyFilter,
    "feriado": HolidayFilter,
}

# Backwards-compatible aliases while the rest of the codebase is still migrating.
