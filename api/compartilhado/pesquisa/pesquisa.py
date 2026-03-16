from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get("q", "").strip()

        if not q:
            return Response(
                {
                    "pacientes": [],
                    "requisicoes": [],
                }
            )

        pacientes = list(
            Paciente.objects.filter(
                Q(nome__icontains=q) | Q(numero_id__icontains=q) | Q(id_custom__icontains=q)
            ).values("id", "id_custom", "nome")[:10]
        )

        requisicoes = list(
            RequisicaoAnalise.objects.filter(Q(id_custom__icontains=q) | Q(paciente__nome__icontains=q))
            .select_related("paciente")
            .values("id", "id_custom", "paciente__nome")[:10]
        )

        return Response(
            {
                "pacientes": pacientes,
                "requisicoes": requisicoes,
            }
        )
