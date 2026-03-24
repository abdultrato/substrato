from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.result_item import ResultItem


class NotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pendentes = ResultItem.objects.filter(validado=False).count()

        requisicoes_hoje = LabRequest.objects.filter(criado_em__date=timezone.localdate()).count()

        return Response(
            {
                "resultados_pendentes": pendentes,
                "requisicoes_hoje": requisicoes_hoje,
            }
        )
