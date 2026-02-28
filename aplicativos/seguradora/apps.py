from django.apps import AppConfig


class SeguradoraConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.seguradora"
    verbose_name = "Seguradora"

    def ready(self):
        """
        Importa sinais de forma segura.
        Evita import circular.
        """
        try:
            import aplicativos.seguradora.sinais  # noqa
        except Exception:
            pass
