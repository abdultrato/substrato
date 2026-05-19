from django.db.models import Count, Sum
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated as ia
from rest_framework.response import Response
from rest_framework.views import APIView

from frontend.billing.models.invoice import Invoice as f
from frontend.billing.models.lab_exam import LabExam as e
from frontend.billing.models.lab_request import LabRequest as ra


class StatsView(APIView):
    permission_classes = [ia]

    def get(self, request):
        inicio_mes = now().replace(day=1)

        exames_populares = e.objects.annotate(total=Count("requisicoes")).order_by("-total")[:5].values("nome", "total")

        faturamento_mes = f.objects.filter(criada_em__gte=inicio_mes).aggregate(total=Sum("total"))["total"] or 0

        requisicoes_mes = ra.objects.filter(criado_em__gte=inicio_mes).count()

        return Response(
            {
                "exames_populares": list(exames_populares),
                "faturamento_mes": faturamento_mes,
                "requisicoes_mes": requisicoes_mes,
            }
        )
