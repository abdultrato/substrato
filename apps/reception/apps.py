from django.apps import AppConfig


class ReceptionConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.reception"  # Caminho da app
    label = "recepcao"  # Label curto para DB/migrations
    verbose_name = "Recepção e Atendimento ao Paciente"  # Nome exibido no admin
