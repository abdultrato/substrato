# LOCAL: nucleo/mixins/versionamento.py

from django.db import models
from django.db.models import F


class VersioningMixin(models.Model):
    version = models.PositiveIntegerField(db_column="versao", default=1)

    class Meta:
        abstract = True

    def increment_version(self):
        self.__class__.objects.filter(pk=self.pk).update(version=F("version") + 1)
        self.refresh_from_db(fields=["version"])

    @property
    def versao(self):
        return self.version

    @versao.setter
    def versao(self, value):
        self.version = value


VersionamentoMixin = VersioningMixin
VersioningMixin.incrementar_version = VersioningMixin.increment_version
