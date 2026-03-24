import time

from django.utils.timezone import now
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

START_TIME = time.time()


class UptimeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        uptime_seconds = int(time.time() - START_TIME)

        return Response(
            {
                "uptime_seconds": uptime_seconds,
                "started_at": now().timestamp() - uptime_seconds,
            }
        )
