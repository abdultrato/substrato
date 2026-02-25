from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class PaginationInfoView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "default_page_size": settings.REST_FRAMEWORK.get("PAGE_SIZE"),
                "pagination_class": settings.REST_FRAMEWORK.get("DEFAULT_PAGINATION_CLASS"),
            }
        )
