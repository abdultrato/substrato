"""Mixin para campo `name` com index e verbose."""

from django.db import models


class NameMixin(models.Model):
    """
    Standard name field.

    ✔ remove espaços extras
    ✔ capitalização consistente
    ✔ indexado para busca rápida
    """

    name = models.CharField(db_column="name", max_length=120, db_index=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.strip()
            self.name = " ".join(self.name.split())
            self.name = self.name.title()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name or ""
