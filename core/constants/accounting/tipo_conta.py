from django.db import models


class TipoConta(
    models.TextChoices,
):
    ATIVO = "ATI", "Ativo"
    PASSIVO = "PAS", "Passivo"
    RECEITA = "REC", "Receita"
    DESPESA = "DES", "Despesa"
    PATRIMONIO = "PAT", "Patrimônio"
