from rest_framework import serializers
from rest_framework.serializers import ModelSerializer as ms

from frontend.billing.models.exame import Exame as e
from frontend.billing.models.exame_campo import ExameCampo as ec

from .base import BaseSerializer as bs


# ===============================
# CAMPOS DO EXAME
# ===============================
class ExameCampoSerializer(ms):
    class Meta:
        model = ec
        fields = [
            "id",
            "nome_campo",
            "tipo",
            "unidade",
            "valor_referencia",
            "ordem",
        ]


# ===============================
# LISTAGEM (leve e rápida)
# ===============================
class ExameListSerializer(ms):
    total_campos = serializers.IntegerField(source="campos.count", read_only=True)

    class Meta:
        model = e
        fields = [
            "id",
            "nome",
            "codigo",
            "setor",
            "metodo",
            "preco",
            "total_campos",
            "activo",
        ]


# ===============================
# DETALHE COMPLETO
# ===============================
class ExameSerializer(ms, bs):
    campos = ExameCampoSerializer(many=True, read_only=True)
    total_campos = serializers.IntegerField(source="campos.count", read_only=True)

    class Meta:
        model = e
        fields = "__all__"


# ====================================
# CREATE / UPDATE (com campos inline)
# ====================================
class ExameCreateSerializer(ms, bs):
    campos = ExameCampoSerializer(many=True, required=False)

    class Meta:
        model = e
        fields = "__all__"

    def create(self, validated_data):
        campos_data = validated_data.pop("campos", [])
        exame = e.objects.create(**validated_data)

        for campo in campos_data:
            ec.objects.create(exame=exame, **campo)

        return exame

    def update(self, instance, validated_data):
        campos_data = validated_data.pop("campos", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if campos_data is not None:
            instance.campos.all().delete()

            for campo in campos_data:
                ec.objects.create(exame=instance, **campo)

        return instance
