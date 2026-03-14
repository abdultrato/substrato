from django.apps import AppConfig


class ProntuarioConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "aplicativos.prontuario"
    verbose_name = "Prontuário"

    def ready(self):
        # Registrar sinais do app (ex.: sincronização Cardex <-> Consultas).
        try:
            from . import sinais  # noqa: F401
        except Exception:
            # Não bloquear boot do Django por falha de import.
            pass
