from django.db import models


class AccountType(
    models.TextChoices,
):
    ATIVO = "ATI", "Ativo"
    PASSIVO = "PAS", "Passivo"
    RECEITA = "REC", "Receita"
    DESPESA = "DES", "Despesa"
    PATRIMONIO = "PAT", "Patrimônio"


TipoConta = AccountType
