from django.db import models
from nucleo.constantes.laboratorio.metodo import Metodo


class MetodoField(models.CharField):
    """
    Campo padronizado para métodos laboratoriais.
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 50)
        kwargs.setdefault("choices", Metodo)
        kwargs.setdefault("db_index", True)
        super().__init__(*args, **kwargs)
