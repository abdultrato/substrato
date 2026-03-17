from django.db.models import Count, Sum
from django.utils.timezone import now
from frontend.billing.models.exame import Exame as e
from frontend.billing.models.fatura import Fatura as f
from frontend.billing.models.requisicao_analise import RequisicaoAnalise as ra
from rest_framework.permissions import IsAuthenticated as ia
from rest_framework.response import Response
from rest_framework.views import APIView


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
