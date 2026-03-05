from django.db import connection, models
from django.db.models import Max
from django.utils.timezone import now


class IdentificadorMixin(models.Model) :
	"""
	Gerador de identificador robusto.

	Compatível com:
	✔ PostgreSQL
	✔ SQLite
	✔ concorrência moderada
	✔ admin do Django
	"""
	
	id_custom = models.CharField(max_length = 30, unique = True, db_index = True, editable = False, blank = True, null = True, verbose_name = "ordem", )
	
	prefixo = None
	
	class Meta :
		abstract = True
	
	# -----------------------------------------------------
	
	@classmethod
	def _next_sequence(cls) :
		# PostgreSQL
		if connection.vendor == "postgresql" :
			sequence_name = f"{cls._meta.db_table}_seq"
			
			with connection.cursor() as cursor :
				cursor.execute(f"CREATE SEQUENCE IF NOT EXISTS {sequence_name};")
				
				cursor.execute(f"SELECT nextval('{sequence_name}');")
				
				return cursor.fetchone()[0]
		
		# SQLite fallback
		
		ultimo = (cls.all_objects.aggregate(max_id = Max("id_custom")))
		
		return (cls.objects.count() or 0) + 1
	
	# -----------------------------------------------------
	
	def gerar_identificador(self) :
		if self.id_custom or not self.prefixo :
			return
		
		numero = self.__class__._next_sequence()
		
		data_str = now().strftime("%Y%m%d")
		
		self.id_custom = f"{self.prefixo}{data_str}{numero:06d}"
	
	# -----------------------------------------------------
	
	def save(self, *args, **kwargs) :
		criando = self._state.adding
		
		if criando and not self.id_custom :
			self.gerar_identificador()
		
		super().save(*args, **kwargs)