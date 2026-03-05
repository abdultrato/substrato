from django.db import models


class StatusClinico(models.TextChoices) :
	NAO_URGENTE = "NAO_URGENTE", "Não urgente"
	NORMAL = 'NORMAL', "Normal"
	ROTINA = "ROTINA", "Rotina"
	PRIORITARIO = "PRIORITARIO", "Prioritário"
	URGENTE = "URGENTE", "Urgente"
	URGENTISSIMO = "URGENTISSIMO", "Urgentíssimo"
	EMERGENCIA = "EMERGENCIA", "Emergência"
	
	POUCO_URGENTE = "POUCO_URGENTE", "Pouco urgente"
	MUITO_URGENTE = "MUITO_URGENTE", "Muito urgente"