from django.db import models


class UnidadeField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 20)
        kwargs.setdefault("blank", True)
        kwargs.setdefault("null", True)
        super().__init__(*args, **kwargs)
