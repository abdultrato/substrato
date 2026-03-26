from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from domain.clinical.result_state import ResultState


class ConfigChoicesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "status_request": ResultState.CHOICES,
            }
        )
