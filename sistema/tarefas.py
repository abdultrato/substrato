from django.utils.timezone import now
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


class BackgroundTasksView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(
            {
                "tasks": [],
                "message": "Nenhuma fila configurada.",
                "timestamp": now(),
            }
        )
