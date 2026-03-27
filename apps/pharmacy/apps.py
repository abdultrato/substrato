from django.apps import AppConfig


class PharmacyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.pharmacy"
    label = "farmacia"
    verbose_name = "Farmácia e Gestão de Estoque"

    def ready(self):
        # Registra sinais de estoque (ex.: entrada automática ao criar lote).
        try:
            from . import signals  # noqa: F401
        except Exception:
            # Em caso de erro de import, não quebrar a inicialização.
            pass
