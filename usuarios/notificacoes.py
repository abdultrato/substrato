from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem


class NotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pendentes = ResultadoItem.objects.filter(validado=False).count()

        requisicoes_hoje = RequisicaoAnalise.objects.filter(criado_em__date=timezone.localdate()).count()

        return Response(
            {
                "resultados_pendentes": pendentes,
                "requisicoes_hoje": requisicoes_hoje,
            }
        )
