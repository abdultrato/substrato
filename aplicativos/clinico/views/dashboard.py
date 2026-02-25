from django.db.models import Count, Sum
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from frontend.billing.models.fatura import Fatura
from frontend.billing.models.paciente import Paciente
from frontend.billing.models.requisicao_analise import RequisicaoAnalise
from frontend.billing.models.resultado_analise import ResultadoItem


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoje = now().date()

        data = {
            "pacientes_total": Paciente.objects.count(),
            "requisicoes_hoje": RequisicaoAnalise.objects.filter(criado_em__date=hoje).count(),
            "resultados_pendentes": ResultadoItem.objects.filter(validado=False).count(),
            "faturamento_total": Fatura.objects.aggregate(total=Sum("total"))["total"] or 0,
            "requisicoes_por_status": list(
                RequisicaoAnalise.objects.values("status").annotate(total=Count("id")).order_by()
            ),
        }

        return Response(data)
