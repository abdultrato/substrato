# LOCAL: nucleo/mixins/versionamento.py

from django.db import models
from django.db.models import F


class VersionamentoMixin(models.Model) :
	versao = models.PositiveIntegerField(default = 1)
	
	class Meta :
		abstract = True
	
	def incrementar_versao(self) :
		self.__class__.objects.filter(pk = self.pk).update(versao = F("versao") + 1)
		self.refresh_from_db(fields = ["versao"])