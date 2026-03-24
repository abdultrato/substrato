from django.utils.timezone import now
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class ServerTimeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        current = now()

        return Response(
            {
                "server_time": current,
                "timestamp": current.timestamp(),
            }
        )
