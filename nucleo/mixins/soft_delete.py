# LOCAL: nucleo/mixins/soft_delete.py

from django.db import models
from django.utils import timezone

from infrastrutura.contexto.request_user import get_current_user


class SoftDeleteMixin(models.Model) :
	deletado = models.BooleanField(default = False, db_index = True)
	deletado_em = models.DateTimeField(null = True, blank = True)
	deletado_por = models.ForeignKey("identidade.Usuario", null = True, blank = True, on_delete = models.SET_NULL, related_name = "%(class)s_deletado", )
	
	class Meta :
		abstract = True
	
	def delete(self, using = None, keep_parents = False) :
		actor = get_current_user()
		
		self.deletado = True
		self.deletado_em = timezone.now()
		
		if actor and getattr(actor, "is_authenticated", False) :
			self.deletado_por = actor
		
		self.save(update_fields = ["deletado", "deletado_em", "deletado_por"])