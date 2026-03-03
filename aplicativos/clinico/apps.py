# LOCAL: aplicativos/clinico/apps.py

from django.apps import AppConfig


class ClinicoConfig(AppConfig) :
	name = "aplicativos.clinico"
	
	def ready(self) :
		from eventos.registro import registrar_handlers
		registrar_handlers()