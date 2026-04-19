"""AutoSchema custom para padronizar tags do OpenAPI."""

from rest_framework.schemas.openapi import AutoSchema


class CustomAutoSchema(AutoSchema):
    """Schema base: mantém tags consistentes e prepara para Swagger/Redoc."""

    def get_tags(self, path, method):
        if hasattr(self.view, "schema_tag"):
            return [self.view.schema_tag]
        return super().get_tags(path, method)
