from django.db import models


class Venda(models.Model):
    numero = models.CharField(max_length=50, unique=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return self.numero
