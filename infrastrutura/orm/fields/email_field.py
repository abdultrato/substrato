from django.db import models


class NormalizedEmailField(models.EmailField):
    """
    Email sempre armazenado em lowercase.
    """

    def to_python(self, value):
        value = super().to_python(value)
        if isinstance(value, str):
            return value.strip().lower()
        return value

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if isinstance(value, str):
            return value.strip().lower()
        return value
