from django.db import models


class MedicalExamSector(models.TextChoices):
    """
    Setores/serviços onde exams médicos (imagem/diagnóstico) são executados.
    Separado dos setores laboratoriais.
    """

    RADIOLOGIA = "Radiologia", "Radiologia"
    DIAGNOSTICO_POR_IMAGEM = "DiagnosticoImagem", "Diagnóstico por Imagem"
    CARDIOLOGIA = "Cardiologia", "Cardiologia"
    GINECO_OBSTETRICIA = "GinecoObstetricia", "Ginecologia/Obstetrícia"
    ORTOPEDIA = "Ortopedia", "Ortopedia/Traumato"
    NEUROLOGIA = "Neurologia", "Neurologia"
    OTORRINO = "Otorrino", "Otorrinolaringologia"
    OFTALMOLOGIA = "Oftalmologia", "Oftalmologia"
    MEDICINA_NUCLEAR = "MedicinaNuclear", "Medicina Nuclear"
    ENDOSCOPIA = "Endoscopia", "Endoscopia"
    OUTRO = "Outro", "Outro"


SetorExameMedico = MedicalExamSector
