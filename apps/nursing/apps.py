from django.apps import AppConfig


class NursingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.nursing"
    label = "enfermagem"
    verbose_name = "Enfermagem e Cuidados"

    def ready(self):
        from core.utils.verbose_names import aplicar_verbose_names_globais

        aplicar_verbose_names_globais()
