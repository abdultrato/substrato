from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class APIVersionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "api": "v1",
                "status": "stable",
            }
        )
