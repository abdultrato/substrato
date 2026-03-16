from django.apps import AppConfig


class ClinicoConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.clinico"
    verbose_name = "Laboratório"

    def ready(self):
        from eventos.registro import registrar_handlers

        registrar_handlers()
