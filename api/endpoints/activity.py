from django.utils.timezone import now, timedelta
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from aplicativos.clinico.modelos.requisicao import Requisicao
from aplicativos.clinico.modelos.resultado import Resultado
from aplicativos.financeiro.modelos.fatura import Fatura


class RecentActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        since = now() - timedelta(days=1)

        requisicoes = (
            Requisicao.objects.filter(criado_em__gte=since).select_related("paciente").order_by("-criado_em")[:5]
        )

        resultados = (
            Resultado.objects.filter(atualizado_em__gte=since).select_related("exame").order_by("-atualizado_em")[:5]
        )

        faturas = Fatura.objects.filter(criado_em__gte=since).select_related("requisicao").order_by("-criado_em")[:5]

        return Response(
            {
                "requisicoes": [
                    {
                        "codigo": r.id,
                        "paciente": r.paciente.nome,
                        "data": r.criado_em,
                        "status": r.status,
                    }
                    for r in requisicoes
                ],
                "resultados": [
                    {
                        "exame": res.exame.nome,
                        "data": res.atualizado_em,
                    }
                    for res in resultados
                ],
                "faturas": [
                    {
                        "codigo": f.id,
                        "total": f.total,
                    }
                    for f in faturas
                ],
            }
        )
