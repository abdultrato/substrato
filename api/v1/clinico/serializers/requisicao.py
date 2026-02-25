from django.db import transaction
from rest_framework import serializers as s
from rest_framework.serializers import BaseSerializer as bs, ModelSerializer as ms

from frontend.billing.models.exame import Exame
from frontend.billing.models.requisicao_analise import (
    RequisicaoAnalise as ra,
    RequisicaoItem as ri,
)
from frontend.billing.models.resultado_analise import ResultadoItem as rsi


# =============================
# RESULTADOS
# =============================
class ResultadoItemSerializer(ms):
    exame_nome = s.CharField(source="exame_campo.exame.nome", read_only=True)
    campo_nome = s.CharField(source="exame_campo.nome", read_only=True)

    class Meta:
        model = rsi
        fields = [
            "id",
            "exame_nome",
            "campo_nome",
            "resultado",
            "validado",
        ]


# =============================
# ITENS FINANCEIROS (snapshot)
# =============================
class RequisicaoItemSerializer(ms, bs):
    exame_nome = s.CharField(source="exame.nome", read_only=True)

    class Meta:
        model = ri
        fields = [
            "id",
            "exame",
            "exame_nome",
            "preco_unitario",
            "quantidade",
        ]


# =============================
# LISTAGEM (leve)
# =============================
class RequisicaoListSerializer(ms):
    paciente_nome = s.CharField(source="paciente.nome", read_only=True)

    class Meta:
        model = ra
        fields = [
            "id",
            "id_custom",
            "paciente_nome",
            "status",
            "created_at",
        ]


# =============================
# DETALHE COMPLETO
# =============================
class RequisicaoDetailSerializer(ms):
    paciente_nome = s.CharField(source="paciente.nome", read_only=True)

    itens = RequisicaoItemSerializer(many=True, read_only=True)
    resultados = ResultadoItemSerializer(many=True, read_only=True)

    class Meta:
        model = ra
        fields = "__all__"


# =============================
# CREATE
# =============================
class RequisicaoCreateSerializer(ms, bs):
    exames = s.PrimaryKeyRelatedField(many=True, queryset=Exame.objects.filter(activo=True))

    class Meta:
        model = ra
        fields = [
            "paciente",
            "numero_id",
            "exames",
            "observacoes",
        ]

    @transaction.atomic
    def create(self, validated_data):
        exames = validated_data.pop("exames", [])

        requisicao = ra.objects.create(**validated_data)

        requisicao.exames.set(exames)

        # cria snapshot financeiro
        requisicao.criar_itens_automaticos()

        # cria resultados automaticamente
        requisicao.criar_resultados_automaticos()

        return requisicao


# =============================
# UPDATE
# =============================
class RequisicaoUpdateSerializer(ms, bs):
    exames = s.PrimaryKeyRelatedField(
        many=True,
        queryset=Exame.objects.filter(activo=True),
        required=False,
    )

    class Meta:
        model = ra
        fields = [
            "paciente",
            "numero_id",
            "exames",
            "observacoes",
            "status",
        ]

    def update(self, instance, validated_data):
        exames = validated_data.pop("exames", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if exames is not None:
            instance.exames.set(exames)
            instance.criar_itens_automaticos()
            instance.criar_resultados_automaticos()

        return instance
