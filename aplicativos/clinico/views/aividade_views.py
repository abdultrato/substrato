from django.utils.timezone import now, timedelta as td
from rest_framework.permissions import IsAuthenticated as aut
from rest_framework.response import Response
from rest_framework.views import APIView

from frontend.billing.models.fatura import Fatura as f
from frontend.billing.models.requisicao_analise import RequisicaoAnalise as re
from frontend.billing.models.resultado_analise import ResultadoItem as ri


class RecentActivityView(APIView):
    permission_classes = [aut]

    def get(self, request):
        since = now() - td(days=1)

        requisicoes = re.objects.filter(criado_em__gte=since).select_related("paciente").order_by("-criado_em")[:5]

        resultados = (
            ri.objects.filter(atualizado_em__gte=since)
            .select_related("exame_campo__exame")
            .order_by("-atualizado_em")[:5]
        )

        faturas = f.objects.filter(criada_em__gte=since).select_related("paciente").order_by("-criada_em")[:5]

        return Response(
            {
                "requisicoes": [
                    {
                        "codigo": r.id_custom,
                        "paciente": r.paciente.nome,
                        "data": r.criado_em,
                        "status": r.status,
                    }
                    for r in requisicoes
                ],
                "resultados": [
                    {
                        "campo": res.exame_campo.nome_campo,
                        "exame": res.exame_campo.exame.nome,
                        "validado": res.validado,
                        "data": res.atualizado_em,
                    }
                    for res in resultados
                ],
                "faturas": [
                    {
                        "codigo": f.id_custom,
                        "paciente": f.paciente.nome,
                        "total": f.total,
                        "estado": f.estado,
                    }
                    for f in faturas
                ],
            }
        )
