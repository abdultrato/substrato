from rest_framework.schemas.openapi import AutoSchema


class CustomAutoSchema(AutoSchema):
    """
    Schema base para documentação OpenAPI futura.

    ✔ pronto para Swagger / Redoc
    ✔ padronização de tags
    ✔ escalável
    """

    def get_tags(self, path, method):
        if hasattr(self.view, "schema_tag"):
            return [self.view.schema_tag]
        return super().get_tags(path, method)
