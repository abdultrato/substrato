from rest_framework.authentication import SessionAuthentication

class AutenticacaoSegura(SessionAuthentication):
    def enforce_csrf(self, request):
        return
