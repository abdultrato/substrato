from django.db.models import Count, Sum
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao import Requisicao
from aplicativos.clinico.modelos.resultado import Resultado
from aplicativos.financeiro.modelos.fatura import Fatura


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoje = now().date()

        data = {
            "pacientes_total": Paciente.objects.count(),
            "requisicoes_hoje": Requisicao.objects.filter(criado_em__date=hoje).count(),
            "resultados_pendentes": Resultado.objects.filter(status_clinico="").count(),
            "faturamento_total": Fatura.objects.aggregate(total=Sum("total"))["total"] or 0,
            "requisicoes_por_status": list(Requisicao.objects.values("status").annotate(total=Count("id")).order_by()),
        }

        return Response(data)
