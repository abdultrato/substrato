from django.db import models

from core.constants.laboratory.method import Metodo


class MetodoField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 50)
        kwargs.setdefault("choices", Metodo.choices)
        kwargs.setdefault("db_index", True)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs["choices"] = Metodo.choices
        return name, path, args, kwargs
