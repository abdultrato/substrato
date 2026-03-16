from rest_framework.viewsets import ModelViewSet

from api.v1.clinico.serializers.base import BaseSerializer
from aplicativos.seguradora.modelos.seguradora import Seguradora


class SeguradoraViewSet(ModelViewSet):
    queryset = Seguradora.objects.all()
    serializer_class = BaseSerializer
