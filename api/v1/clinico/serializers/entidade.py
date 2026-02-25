import re

from rest_framework import serializers
from rest_framework.serializers import ModelSerializer as ms

from frontend.contabilidade.entidade import Entidade as e

from .base import BaseSerializer as bs

# ================================
# VALIDADORES AUXILIARES
# ================================


def normalizar_telefone(numero: str | None):
    if not numero:
        return numero
    return re.sub(r"\D", "", numero)


def validar_telefone_mz(numero):
    """
    Telefones Moçambique:
    82, 83, 84, 85, 86, 87
    total: 9 dígitos
    """
    if not numero:
        return numero

    numero = normalizar_telefone(numero)

    if len(numero) != 9:
        raise serializers.ValidationError("Telefone deve ter 9 dígitos.")

    if not numero.startswith(("82", "83", "84", "85", "86", "87")):
        raise serializers.ValidationError("Telefone inválido para Moçambique.")

    return numero


# ================================
# SERIALIZER BASE
# ================================


class EntidadeSerializer(ms, bs):
    class Meta:
        model = e
        fields = [
            "id",
            "nome",
            "slogan",
            "endereco_sede",
            "telefone1",
            "telefone2",
            "email",
            "nuit",
            "ativo",
            "criado_em",
        ]
        read_only_fields = ["criado_em"]


# ================================
# LIST SERIALIZER (PERFORMANCE)
# ================================


class EntidadeListSerializer(ms, bs):
    class Meta:
        model = e
        fields = [
            "id",
            "nome",
            "slogan",
            "endereco_sede",
            "telefone1",
            "telefone2",
            "nuit",
            "email",
            "ativo",
        ]


# ================================
# CREATE / UPDATE SERIALIZER
# ================================


class EntidadeCreateSerializer(ms, bs):
    class Meta:
        model = e
        fields = [
            "nome",
            "slogan",
            "endereco_sede",
            "telefone1",
            "telefone2",
            "email",
            "nuit",
            "ativo",
        ]

    # ======================
    # NORMALIZAÇÕES
    # ======================

    def validate_nome(self, value):
        return value.strip().title()

    def validate_email(self, value):
        return value.lower().strip() if value else value

    def validate_telefone1(self, value):
        return validar_telefone_mz(value)

    def validate_telefone2(self, value):
        return validar_telefone_mz(value)

    # ======================
    # NUIT (MOÇAMBIQUE)
    # ======================

    def validate_nuit(self, value):
        if value:
            value = value.strip()

            if not value.isdigit():
                raise serializers.ValidationError("NUIT deve conter apenas números.")

            if len(value) != 9:
                raise serializers.ValidationError("NUIT deve ter 9 dígitos.")

            if value == "000000000":
                raise serializers.ValidationError("NUIT inválido.")

        return value

    # ======================
    # DUPLICIDADE LÓGICA
    # ======================

    def validate(self, data):
        nome = data.get("nome")

        qs = e.objects.filter(nome__iexact=nome)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError({"nome": "Já existe uma entidade com este nome."})

        return data
