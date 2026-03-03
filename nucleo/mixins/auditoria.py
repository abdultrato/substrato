# LOCAL: nucleo/mixins/auditoria.py

from django.conf import settings
from django.db import models

from infrastrutura.contexto.request_user import get_current_user


class AuditoriaMixin(models.Model) :
	criado_em = models.DateTimeField(auto_now_add = True, db_index = True, )
	
	atualizado_em = models.DateTimeField(auto_now = True, )
	
	criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete = models.SET_NULL, null = True, blank = True, related_name = "%(class)s_criado", )
	
	atualizado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete = models.SET_NULL, null = True, blank = True, related_name = "%(class)s_atualizado", )
	
	class Meta :
		abstract = True
	
	def save(self, *args, **kwargs) :
		actor = get_current_user()
		is_create = not self.pk
		
		if actor and getattr(actor, "is_authenticated", False) :
			if is_create and not self.criado_por_id :
				self.criado_por = actor
			
			self.atualizado_por = actor
			
			update_fields = kwargs.get("update_fields")
			
			if update_fields is not None :
				fields = set(update_fields)
				
				if is_create :
					fields.add("criado_por")
				
				fields.add("atualizado_por")
				
				kwargs["update_fields"] = list(fields)
		
		super().save(*args, **kwargs)