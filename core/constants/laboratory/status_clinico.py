from django.db import models


class StatusClinico(models.TextChoices):
    NAO_URGENTE = "NAO_URGENTE", "Não urgente"
    NORMAL = "NORMAL", "Normal"
    ROTINA = "ROTINA", "Rotina"
    POUCO_URGENTE = "POUCO_URGENTE", "Pouco urgente"
    PRIORITARIO = "PRIORITARIO", "Prioritário"
    URGENTE = "URGENTE", "Urgente"
    MUITO_URGENTE = "MUITO_URGENTE", "Muito urgente"
    URGENTISSIMO = "URGENTISSIMO", "Urgentíssimo"
    EMERGENCIA = "EMERGENCIA", "Emergência"
