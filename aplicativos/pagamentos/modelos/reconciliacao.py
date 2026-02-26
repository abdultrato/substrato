from django.db import models


class Reconciliacao(models.Model):

    transacao = models.ForeignKey(
        "pagamentos.Transacao",
        on_delete=models.CASCADE,
        related_name="reconciliacoes",
    )

    confirmado = models.BooleanField(default=False)

    data_confirmacao = models.DateTimeField(null=True, blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)
