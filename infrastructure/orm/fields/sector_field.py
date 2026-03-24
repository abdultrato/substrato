from django.db import models

from core.constants.laboratory.sector import Setor


class SectorField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 40)
        kwargs.setdefault("choices", Setor.choices)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)

SetorField = SectorField


