from django.db import models


class MedicalExamResultType(models.TextChoices):
    """
    Tipos de saída esperados para exams médicos (imagem/diagnóstico).
    Controla o type de campo exibido ao lançar result.
    """

    RELATORIO_PDF = "PDF", "Laudo/Relatório (PDF)"
    IMAGEM = "IMAGEM", "Imagem (JPEG/PNG)"
    DICOM = "DICOM", "DICOM"
    VIDEO = "VIDEO", "Vídeo/loop"
    TEXTO = "TEXTO", "Texto livre"
    NUMERICO = "NUMERICO", "Valor numérico"


TipoResultadoExameMedico = MedicalExamResultType
