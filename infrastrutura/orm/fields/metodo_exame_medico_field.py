from django.db import models

from nucleo.constantes.exame_medico.metodo_exame_medico import MetodoExameMedico


class MetodoExameMedicoField(models.CharField):
    """
    CharField com choices para métodos de exames médicos (imagem/diagnóstico).
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 30)
        kwargs.setdefault("choices", MetodoExameMedico.choices)
        kwargs.setdefault("db_index", True)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs["choices"] = MetodoExameMedico.choices
        return name, path, args, kwargs
