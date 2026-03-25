from django.db import models


class DescriptionMixin(models.Model):
    """
    Standard description field.

    ✔ remove espaços extras
    ✔ evita textos sujos
    """

    description = models.TextField(blank=True, null=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.description:
            self.description = self.description.strip()
        super().save(*args, **kwargs)
