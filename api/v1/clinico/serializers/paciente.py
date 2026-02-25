from rest_framework import serializers as s
from rest_framework.serializers import BaseSerializer as bs, ModelSerializer as ms, ValidationError as ve

from frontend.billing.models.paciente import Paciente


class PacienteWriteSerializer(ms, bs):
    """
    Serializer usado apenas para CREATE e UPDATE.
    Somente campos que o frontend pode enviar.
    Nada de campos calculados, automáticos ou read-only.
    """

    class Meta:
        model = Paciente
        fields = [
            "nome",
            "data_nascimento",
            "genero",
            "raca_origem",
            "tipo_documento",
            "numero_id",
            "contacto",
            "email",
            "proveniencia",
            "morada",
        ]

    def validate_nome(self, value):
        value = (value or "").strip()
        if len(value) < 3:
            raise ve("Nome muito curto.")
        return value

    def validate_numero_id(self, value):
        return value.strip() if value else None

    def validate_email(self, value):
        return value.strip().lower() if value else None


class PacienteReadSerializer(ms, bs):
    """
    Serializer usado para LIST e RETRIEVE.
    Aqui entram campos calculados e derivados.
    """

    idade = s.SerializerMethodField()

    class Meta:
        model = Paciente
        fields = "__all__"

    def get_idade(self, obj):
        return obj.idade()
