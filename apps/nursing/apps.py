from django.apps import AppConfig


class NursingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.nursing"  # Caminho da app
    label = "enfermagem"  # Label curto para DB/migrations
    verbose_name = "Enfermagem e Cuidados"  # Nome exibido no admin

    def ready(self):
        from core.utils.verbose_names import aplicar_verbose_names_globais

        aplicar_verbose_names_globais()
