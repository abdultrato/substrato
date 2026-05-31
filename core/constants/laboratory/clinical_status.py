from django.db import models


class ClinicalStatus(models.TextChoices):
    NON_URGENT = "NAO_URGENTE", "Não urgente"
    NORMAL = "NORMAL", "Normal"
    ROUTINE = "ROTINA", "Rotina"
    LOW_URGENCY = "POUCO_URGENTE", "Pouco urgente"
    PRIORITY = "PRIORITARIO", "Prioritário"
    URGENT = "URGENTE", "Urgente"
    VERY_URGENT = "MUITO_URGENTE", "Muito urgente"
    EXTREMELY_URGENT = "URGENTISSIMO", "Urgentíssimo"
    EMERGENCY = "EMERGENCIA", "Emergência"


CLINICAL_ATTENDANCE_PRIORITY = {
    ClinicalStatus.EMERGENCY: 0,
    ClinicalStatus.EXTREMELY_URGENT: 1,
    ClinicalStatus.VERY_URGENT: 2,
    ClinicalStatus.URGENT: 3,
    ClinicalStatus.LOW_URGENCY: 4,
    ClinicalStatus.PRIORITY: 5,
    ClinicalStatus.NORMAL: 6,
    ClinicalStatus.NON_URGENT: 6,
    ClinicalStatus.ROUTINE: 6,
}
CLINICAL_ATTENDANCE_DEFAULT_PRIORITY = 6


def clinical_attendance_priority_case(field_name: str = "clinical_status"):
    return models.Case(
        *[
            models.When(**{field_name: status}, then=models.Value(priority))
            for status, priority in CLINICAL_ATTENDANCE_PRIORITY.items()
        ],
        default=models.Value(CLINICAL_ATTENDANCE_DEFAULT_PRIORITY),
        output_field=models.PositiveSmallIntegerField(),
    )
