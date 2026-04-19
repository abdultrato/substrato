"""Exposição de informações de versão/configuração da aplicação."""

import sys

import django
from django.conf import settings
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


class SystemInfoView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(
            {
                "django_version": django.get_version(),
                "python_version": sys.version.split()[0],
                "environment": "development" if settings.DEBUG else "production",
                "timezone": settings.TIME_ZONE,
                "language": settings.LANGUAGE_CODE,
            }
        )
