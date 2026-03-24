from django.db import models


class NameMixin(models.Model):
    """
    Standard name field.

    ✔ remove espaços extras
    ✔ capitalização consistente
    ✔ indexado para busca rápida
    """

    nome = models.CharField(max_length=120, db_index=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.nome:
            self.nome = self.nome.strip()
            self.nome = " ".join(self.nome.split())
            self.nome = self.nome.title()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nome or ""


NomeMixin = NameMixin
