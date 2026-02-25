from django.db.models import Q
from rest_framework.permissions import IsAuthenticated as aut
from rest_framework.response import Response
from rest_framework.views import APIView

from frontend.billing.models.paciente import Paciente as p
from frontend.billing.models.requisicao_analise import RequisicaoAnalise as ra
from frontend.contabilidade.entidade import Entidade as e


class GlobalSearchView(APIView):
    permission_classes = [aut]

    def get(self, request):
        q = request.query_params.get("q", "").strip()

        if not q:
            return Response(
                {
                    "pacientes": [],
                    "requisicoes": [],
                    "entidades": [],
                }
            )

        pacientes = list(
            p.objects.filter(Q(nome__icontains=q) | Q(numero_id__icontains=q) | Q(id_custom__icontains=q)).values(
                "id", "id_custom", "nome"
            )[:10]
        )

        requisicoes = list(
            ra.objects.filter(Q(id_custom__icontains=q) | Q(paciente__nome__icontains=q))
            .select_related("paciente")
            .values("id", "id_custom", "paciente__nome")[:10]
        )

        entidades = list(e.objects.filter(Q(nome__icontains=q) | Q(nuit__icontains=q)).values("id", "nome")[:10])

        return Response(
            {
                "pacientes": pacientes,
                "requisicoes": requisicoes,
                "entidades": entidades,
            }
        )
