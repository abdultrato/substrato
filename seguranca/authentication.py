from rest_framework_simplejwt.authentication import JWTAuthentication


class JWTAuth(JWTAuthentication):
    """
    Camada customizada para futura expansão:

    ✔ multi-tenant
    ✔ auditoria
    ✔ tokens revogáveis
    ✔ login por dispositivo
    """

    def authenticate(self, request):
        return super().authenticate(request)
