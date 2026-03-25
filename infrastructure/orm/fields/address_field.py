from django.core.exceptions import ValidationError
from django.db import models


class AddressField(models.JSONField):
    """
    Campo para armazenar endereço estruturado em JSON.

    Estrutura padrão:
    {
        "rua": "",
        "number": "",
        "bairro": "",
        "cidade": "",
        "provincia": "",
        "code_postal": "",
        "pais": "Moçambique",
        "complemento": ""
    }
    """

    estrutura_padrao = {
        "rua": "",
        "number": "",
        "bairro": "",
        "cidade": "",
        "provincia": "",
        "code_postal": "",
        "pais": "Moçambique",
        "complemento": "",
    }

    def __init__(self, *args, **kwargs):
        # Default precisa ser um callable "estável" (não bound-method) para evitar
        # o Django gerar migrations infinitas ao comparar o campo.
        kwargs.setdefault("default", AddressField.default_address)
        super().__init__(*args, **kwargs)

    @staticmethod
    def default_address():
        return AddressField.estrutura_padrao.copy()

    def validate(self, value, model_instance):
        super().validate(value, model_instance)

        if not isinstance(value, dict):
            raise ValidationError("Endereço deve ser um objeto JSON.")

        campos_validos = set(self.estrutura_padrao.keys())

        for key in value:
            if key not in campos_validos:
                raise ValidationError(f"Campo de endereço inválido: {key}")

    def get_prep_value(self, value):
        """
        Garante que todos os campos existam antes de salvar.
        """
        if value is None:
            return self.default_address()

        endereco = self.estrutura_padrao.copy()
        endereco.update(value)

        return super().get_prep_value(endereco)

EnderecoField = AddressField

AddressField.default_endereco = AddressField.default_address


