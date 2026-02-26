from django.db import models
from django.utils import timezone


class SoftDeleteMixin(models.Model):
    """
    Exclusão lógica corporativa.
    """

    deletado = models.BooleanField(default=False, db_index=True)
    deletado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.deletado = True
        self.deletado_em = timezone.now()
        self.save(update_fields=["deletado", "deletado_em"])
