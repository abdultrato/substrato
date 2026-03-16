from django.db import models

from nucleo.constantes.laboratorio.tipo_resultado import TipoResultado


class TipoResultadoField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 20)
        kwargs.setdefault("choices", TipoResultado.choices)
        super().__init__(*args, **kwargs)
