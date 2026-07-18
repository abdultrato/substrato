from api.core.filters import SafeFilterSet
import django_filters
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.human_resources.models.employee import Employee


class MedicalConsultationFilter(SafeFilterSet):
    specialty_sector = django_filters.CharFilter(field_name="specialty__sector")
    sector = django_filters.CharFilter(field_name="specialty__sector")

    class Meta:
        model = MedicalConsultation
        fields = [
            "patient",
            "doctor",
            "specialty",
            "specialty_sector",
            "sector",
            "type",
            "consultation_type",
            "status",
            "schedule_type",
            "manual_holiday",
            "scheduled_for",
            "created_at",
        ]


class DoctorFilter(SafeFilterSet):
    class Meta:
        model = Employee
        fields = ["name", "profession", "role", "is_medical_doctor", "is_surgeon", "medical_specialty", "status", "created_at"]


class ConsultationSpecialtyFilter(SafeFilterSet):
    class Meta:
        model = ConsultationSpecialty
        fields = ["name", "active", "sector", "base_price"]


class HolidayFilter(SafeFilterSet):
    class Meta:
        model = Holiday
        fields = ["date", "active"]


FILTER_MAP = {
    "consultation": MedicalConsultationFilter,
    "doctors": DoctorFilter,
    "specialty": ConsultationSpecialtyFilter,
    "holiday": HolidayFilter,
}
