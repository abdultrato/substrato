from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from seguranca.permissoes import IsAdmin


class SecurityCheckView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(
            {
                "debug": settings.DEBUG,
                "secure_ssl_redirect": getattr(settings, "SECURE_SSL_REDIRECT", False),
                "session_cookie_secure": getattr(
                    settings, "SESSION_COOKIE_SECURE", False
                ),
                "csrf_cookie_secure": getattr(settings, "CSRF_COOKIE_SECURE", False),
                "x_frame_options": getattr(settings, "X_FRAME_OPTIONS", "DENY"),
            }
        )
