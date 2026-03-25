from django.db import models

from core.constants.laboratory.result_type import ResultType


class ResultTypeField(models.CharField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("max_length", 20)
        kwargs.setdefault("choices", ResultType.choices)
        super().__init__(*args, **kwargs)


