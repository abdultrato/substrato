from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from aplicativos.clinico.modelos.requisicao import Requisicao


class ConfigChoicesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "status_requisicao": Requisicao.Status.choices,
            }
        )
