"""Shim de compatibilidade para ambientes sem drf-spectacular real instalado."""

from rest_framework.response import Response
from rest_framework.views import APIView


class _UnavailableDocsView(APIView):
    """Retorna 503 informando que a documentação automática está indisponível."""

    def get(self, request, *args, **kwargs):
        return Response({"detail": "drf-spectacular compatibility shim active."}, status=503)


class SpectacularAPIView(_UnavailableDocsView):
    """Endpoint placeholder para `/api/schema/` quando a lib não está presente."""

    pass


class SpectacularSwaggerView(_UnavailableDocsView):
    """Endpoint placeholder para a UI Swagger da documentação."""

    @classmethod
    def as_view(cls, *args, **kwargs):
        kwargs.pop("url_name", None)
        return super().as_view(*args, **kwargs)


class SpectacularRedocView(_UnavailableDocsView):
    """Endpoint placeholder para a UI Redoc da documentação."""

    @classmethod
    def as_view(cls, *args, **kwargs):
        kwargs.pop("url_name", None)
        return super().as_view(*args, **kwargs)
