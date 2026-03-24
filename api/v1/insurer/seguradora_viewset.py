from rest_framework.viewsets import ModelViewSet

from api.v1.clinical.serializers.base import BaseSerializer
from apps.insurer.models.insurer import Insurer


class SeguradoraViewSet(ModelViewSet):
    queryset = Insurer.objects.all()
    serializer_class = BaseSerializer
