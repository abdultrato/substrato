from django.conf import settings
from django.utils.translation import get_language
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class LanguageInfoView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "current_language": get_language(),
                "default_language": settings.LANGUAGE_CODE,
                "available_languages": getattr(settings, "LANGUAGES", []),
            }
        )
