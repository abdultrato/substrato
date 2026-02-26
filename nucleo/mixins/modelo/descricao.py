from django.db import models


class DescricaoMixin(models.Model):
    """
    Campo de descrição institucional.

    ✔ remove espaços extras
    ✔ evita textos sujos
    """

    descricao = models.TextField(blank=True, null=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.descricao:
            self.descricao = self.descricao.strip()
        super().save(*args, **kwargs)
