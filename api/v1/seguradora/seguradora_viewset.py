from rest_framework.viewsets import ModelViewSet
from aplicativos.seguradora.modelos.seguradora import Seguradora
from api.v1.clinico.serializers.base import BaseSerializer


class SeguradoraViewSet(ModelViewSet):
    queryset = Seguradora.objects.all()
    serializer_class = BaseSerializer
