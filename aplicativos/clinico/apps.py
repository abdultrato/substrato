from django.apps import AppConfig


class ClinicoConfig(AppConfig) :
	default_auto_field = "django.db.models.BigAutoField"
	name = "aplicativos.clinico"
	verbose_name = "Gestão Clínica"
	
	def ready(self) :
		pass
