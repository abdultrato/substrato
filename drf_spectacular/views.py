from rest_framework.response import Response
from rest_framework.views import APIView


class _UnavailableDocsView(APIView):
    def get(self, request, *args, **kwargs):
        return Response({"detail": "drf-spectacular compatibility shim active."}, status=503)


class SpectacularAPIView(_UnavailableDocsView):
    pass


class SpectacularSwaggerView(_UnavailableDocsView):
    @classmethod
    def as_view(cls, *args, **kwargs):
        kwargs.pop("url_name", None)
        return super().as_view(*args, **kwargs)


class SpectacularRedocView(_UnavailableDocsView):
    @classmethod
    def as_view(cls, *args, **kwargs):
        kwargs.pop("url_name", None)
        return super().as_view(*args, **kwargs)
