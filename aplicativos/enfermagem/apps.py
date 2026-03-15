from django.apps import AppConfig


class EnfermagemConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.enfermagem"
    verbose_name = "Enfermagem"

    def ready(self):
        from nucleo.utils.verbose_names import aplicar_verbose_names_globais

        aplicar_verbose_names_globais()
