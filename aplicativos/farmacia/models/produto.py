from django.db import models


class Produto(models.Model):
    nome = models.CharField(max_length=150)
    codigo = models.CharField(max_length=50, unique=True)

    tipo = models.CharField(
        max_length=3,
        choices=[
            ("MED", "Medicamento"),
            ("CON", "Consumível"),
            ("OUT", "Outro"),
        ],
    )

    preco_venda = models.DecimalField(max_digits=12, decimal_places=2)
    ativo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.codigo} - {self.nome}"
