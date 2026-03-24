from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.result_item import ResultItem


class NotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pending_results = ResultItem.objects.filter(validado=False).count()

        requests_today = LabRequest.objects.filter(criado_em__date=timezone.localdate()).count()

        return Response(
            {
                "resultados_pendentes": pending_results,
                "requisicoes_hoje": requests_today,
            }
        )
