from django.db import models


class EnderecoField(models.JSONField):
    """
    Armazena endereço estruturado como JSON.
    Exemplo:
    {
        "rua": "...",
        "cidade": "...",
        "pais": "Moçambique"
    }
    """

    pass
