from django.apps import AppConfig


class ClinicalLaboratoryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"  # IDs autoincremento
    name = "apps.clinical_laboratory"  # Caminho da app
    label = "laboratorio"  # Label curto para DB/migrations
    verbose_name = "Laboratório Clínico (LIS)"  # Nome exibido no admin
