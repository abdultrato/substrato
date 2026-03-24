from django.db.models import Count, Sum
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinical.models.patient import Patient
from apps.clinical.models.requisicao import Requisicao
from apps.clinical.models.result import Result
from apps.financeiro.models.invoice import Invoice


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        hoje = now().date()

        data = {
            "pacientes_total": Patient.objects.count(),
            "requisicoes_hoje": Requisicao.objects.filter(criado_em__date=hoje).count(),
            "resultados_pendentes": Result.objects.filter(status_clinico="").count(),
            "faturamento_total": Invoice.objects.aggregate(total=Sum("total"))["total"] or 0,
            "requisicoes_por_status": list(Requisicao.objects.values("status").annotate(total=Count("id")).order_by()),
        }

        return Response(data)
