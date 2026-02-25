from rest_framework.permissions import IsAuthenticated as aut
from rest_framework.response import Response
from rest_framework.views import APIView

from frontend.billing.models.exame import Exame as e
from frontend.constants import (
    Genero as g,
    Proveniencia as p,
    RacaOrigem as ro,
    TipoDocumento as td,
)


class ConfigChoicesView(APIView):
    permission_classes = [aut]

    def get(self, request):
        return Response(
            {
                "generos": g.choices,
                "racas": ro.choices,
                "documentos": td.choices,
                "proveniencias": p.choices,
                "metodos_exame": e.MetodoExame.choices,
                "setores_exame": e.SetorExame.choices,
            }
        )
