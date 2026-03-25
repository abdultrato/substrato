from django.db import models

from core.constants.medical_exam.medical_exam_sector import MedicalExamSector


class MedicalExamSectorField(models.CharField):
    """
    CharField com choices específicos para setores de exams médicos.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 40)
        kwargs.setdefault("choices", MedicalExamSector.choices)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs["choices"] = MedicalExamSector.choices
        return name, path, args, kwargs


