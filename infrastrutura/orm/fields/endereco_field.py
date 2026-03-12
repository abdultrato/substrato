from django.db import models
from django.core.exceptions import ValidationError


class EnderecoField(models.JSONField):
    """
    Campo para armazenar endereço estruturado em JSON.

    Estrutura padrão:
    {
        "rua": "",
        "numero": "",
        "bairro": "",
        "cidade": "",
        "provincia": "",
        "codigo_postal": "",
        "pais": "Moçambique",
        "complemento": ""
    }
    """

    estrutura_padrao = {
        "rua": "",
        "numero": "",
        "bairro": "",
        "cidade": "",
        "provincia": "",
        "codigo_postal": "",
        "pais": "Moçambique",
        "complemento": "",
    }

    def __init__(self, *args, **kwargs):
        # Default precisa ser um callable "estável" (não bound-method) para evitar
        # o Django gerar migrations infinitas ao comparar o campo.
        kwargs.setdefault("default", EnderecoField.default_endereco)
        super().__init__(*args, **kwargs)

    @staticmethod
    def default_endereco():
        return EnderecoField.estrutura_padrao.copy()

    def validate(self, value, model_instance):
        super().validate(value, model_instance)

        if not isinstance(value, dict):
            raise ValidationError("Endereço deve ser um objeto JSON.")

        campos_validos = set(self.estrutura_padrao.keys())

        for chave in value.keys():
            if chave not in campos_validos:
                raise ValidationError(f"Campo de endereço inválido: {chave}")

    def get_prep_value(self, value):
        """
        Garante que todos os campos existam antes de salvar.
        """
        if value is None:
            return self.default_endereco()

        endereco = self.estrutura_padrao.copy()
        endereco.update(value)

        return super().get_prep_value(endereco)
