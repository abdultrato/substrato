from django.utils.timezone import now, timedelta
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinical.models.request import Requisicao
from apps.clinical.models.result import Result
from apps.financeiro.models.invoice import Invoice


class RecentActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        since = now() - timedelta(days=1)

        requisicoes = (
            Requisicao.objects.filter(created_at__gte=since).select_related("patient").order_by("-created_at")[:5]
        )

        resultados = (
            Result.objects.filter(updated_at__gte=since).select_related("exam").order_by("-updated_at")[:5]
        )

        faturas = Invoice.objects.filter(created_at__gte=since).select_related("request").order_by("-created_at")[:5]

        return Response(
            {
                "requisicoes": [
                    {
                        "code": r.id,
                        "patient": r.patient.name,
                        "date": r.created_at,
                        "status": r.status,
                    }
                    for r in requisicoes
                ],
                "resultados": [
                    {
                        "exam": res.exam.name,
                        "date": res.updated_at,
                    }
                    for res in resultados
                ],
                "faturas": [
                    {
                        "code": f.id,
                        "total": f.total,
                    }
                    for f in faturas
                ],
            }
        )
