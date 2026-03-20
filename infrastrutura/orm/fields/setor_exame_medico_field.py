from django.db import models

from nucleo.constantes.exame_medico.setor_exame_medico import SetorExameMedico


class SetorExameMedicoField(models.CharField):
    """
    CharField com choices específicos para setores de exames médicos.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 40)
        kwargs.setdefault("choices", SetorExameMedico.choices)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs["choices"] = SetorExameMedico.choices
        return name, path, args, kwargs
