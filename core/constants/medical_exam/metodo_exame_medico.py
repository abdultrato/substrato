from django.db import models


class MetodoExameMedico(models.TextChoices):
    """
    Modalidades/técnicas típicas de exames médicos (imagem/diagnóstico).
    Mantidas separadas dos métodos laboratoriais.
    """

    ULTRASSONOGRAFIA = "USG", "Ultrassonografia / Ecografia"
    RAIOX_CONVENCIONAL = "RX", "Raio-X Convencional"
    TOMOGRAFIA = "CT", "Tomografia Computorizada (CT)"
    RESSONANCIA = "RM", "Ressonância Magnética (RM)"
    MAMOGRAFIA = "MG", "Mamografia"
    DENSITOMETRIA = "DXA", "Densitometria Óssea (DXA)"
    ECOCARDIOGRAMA = "ECO", "Ecocardiograma"
    ELETROCARDIOGRAMA = "ECG", "Eletrocardiograma (ECG)"
    HOLTER = "HOLTER", "Holter"
    MAPA = "MAPA", "MAPA (PA 24h)"
    EEG = "EEG", "Eletroencefalograma (EEG)"
    ENDOSCOPIA = "ENDO", "Endoscopia"
    COLONOSCOPIA = "COLONO", "Colonoscopia"
    ANGIOGRAFIA = "ANGIO", "Angiografia"
    MEDICINA_NUCLEAR = "MN", "Medicina Nuclear / Cintilografia"
    OUTRO = "OUT", "Outro"
