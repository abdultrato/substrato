from django.conf import settings
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


class EnvironmentView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(
            {
                "debug": settings.DEBUG,
                "allowed_hosts": settings.ALLOWED_HOSTS,
                "timezone": settings.TIME_ZONE,
                "language": settings.LANGUAGE_CODE,
            }
        )
