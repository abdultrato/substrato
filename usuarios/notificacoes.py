from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from frontend.billing.models.requisicao_analise import ResultadoItem as item
from frontend.billing.models.resultado_analise import RequisicaoAnalise as requisicao


class NotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pendentes = item.objects.filter(validado=False).count()

        requisicoes_hoje = requisicao.objects.filter(criado_em__date=now().date()).count()

        return Response(
            {
                "resultados_pendentes": pendentes,
                "requisicoes_hoje": requisicoes_hoje,
            }
        )
