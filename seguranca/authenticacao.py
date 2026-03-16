from rest_framework_simplejwt.authentication import JWTAuthentication


class JWTAuth(JWTAuthentication):
    def authenticate(self, request):
        resultado = super().authenticate(request)

        if resultado:
            user, _token = resultado
            request.usuario_autenticado = user

        return resultado
