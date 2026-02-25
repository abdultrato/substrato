from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class APIDocsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "docs": {
                    "health": "/api/health/",
                    "auth_login": "/api/auth/login/",
                    "auth_refresh": "/api/auth/refresh/",
                    "dashboard": "/api/dashboard/",
                    "search": "/api/search/?q=",
                    "stats": "/api/stats/",
                    "notifications": "/api/notifications/",
                    "recent_activity": "/api/activity/recent/",
                    "export_pacientes": "/api/export/pacientes/",
                    "export_requisicoes": "/api/export/requisicoes/",
                }
            }
        )
