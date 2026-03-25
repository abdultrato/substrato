from django.db import models

from core.constants.medical_exam.medical_exam_method import MedicalExamMethod


class MedicalExamMethodField(models.CharField):
    """
    CharField com choices para métodos de exams médicos (imagem/diagnóstico).
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 30)
        kwargs.setdefault("choices", MedicalExamMethod.choices)
        kwargs.setdefault("db_index", True)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs["choices"] = MedicalExamMethod.choices
        return name, path, args, kwargs


