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
