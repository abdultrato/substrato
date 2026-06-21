"""Minimal schema/documentation views for local development."""

from __future__ import annotations

from typing import Any

from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


class _DynamicDocsPermissionMixin:
    def get_permissions(self):
        permission_class = AllowAny if getattr(settings, "API_DOCS_PUBLIC", False) else IsAdminUser
        return [permission_class()]


class SpectacularAPIView(_DynamicDocsPermissionMixin, APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args: Any, **kwargs: Any):
        from .generators import SchemaGenerator

        generator = SchemaGenerator(title="Substrato API", version="1.0.0")
        return Response(generator.get_schema(request=request, public=True))


class _DocsView(_DynamicDocsPermissionMixin, APIView):
    permission_classes = [AllowAny]
    title = "Substrato API"
    url_name = None

    def get(self, request, *args: Any, **kwargs: Any):
        return Response({"detail": f"{self.title} schema disponível em /api/schema/."})


class SpectacularSwaggerView(_DocsView):
    title = "Swagger UI"


class SpectacularRedocView(_DocsView):
    title = "ReDoc"
