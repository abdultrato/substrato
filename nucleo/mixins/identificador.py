from django.db import models
from django.utils.timezone import now


class IdentificadorMixin(models.Model) :
	id_custom = models.CharField(max_length = 40, unique = True, db_index = True, editable = False, blank = True, null = True, )
	
	prefixo = None
	
	class Meta :
		abstract = True
	
	def gerar_identificador(self) :
		if self.id_custom or not self.prefixo :
			return
		
		timestamp = now().strftime("%Y%m%d-%H%M")
		
		numero = self.pk or 0
		
		self.id_custom = f"{self.prefixo}-{timestamp}-{numero:04d}"
	
	def save(self, *args, **kwargs) :
		criando = self._state.adding
		
		if criando and not self.pk :
			super().save(*args, **kwargs)
			
			self.gerar_identificador()
			
			return super().save(update_fields = ["id_custom"])
		
		return super().save(*args, **kwargs)