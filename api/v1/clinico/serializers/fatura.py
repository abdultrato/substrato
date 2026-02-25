from rest_framework import serializers as s
from rest_framework.serializers import ModelSerializer as ms

from frontend.billing.models.fatura import Fatura as f
from frontend.billing.models.fatura_itens import FaturaItem as fi

from .base import BaseSerializer as bs


class FaturaItemSerializer(ms, bs):
    exame_nome = s.CharField(source="exame.nome", read_only=True)

    class Meta:
        model = fi
        fields = "__all__"


class FaturaSerializer(ms, bs):
    paciente_nome = s.CharField(source="paciente.nome", read_only=True)
    seguradora_nome = s.CharField(source="seguradora.nome", read_only=True)
    itens = FaturaItemSerializer(many=True, read_only=True)

    class Meta:
        model = f
        fields = "__all__"
