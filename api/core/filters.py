import django_filters


class SafeFilterSet(django_filters.FilterSet) :
	"""
	FilterSet corporativo que ignora campos inexistentes
	sem quebrar o sistema.
	"""
	
	@classmethod
	def get_filters(cls) :
		# Se for a classe base (sem model definido)
		if not hasattr(cls, "_meta") or not getattr(cls._meta, "model", None) :
			return super().get_filters()
		
		model = cls._meta.model
		declared_fields = cls._meta.fields
		
		# Se usar "__all__", delega ao comportamento padrão
		if declared_fields == "__all__" :
			return super().get_filters()
		
		# Campos reais do model
		model_fields = {f.name for f in model._meta.get_fields()}
		
		# Filtra apenas campos válidos
		valid_fields = [field for field in declared_fields if field in model_fields]
		
		# NÃO modificar _meta.fields permanentemente
		original_fields = cls._meta.fields
		cls._meta.fields = valid_fields
		
		filters = super().get_filters()
		
		# Restaurar estado original
		cls._meta.fields = original_fields
		
		return filters