from django.db import models

class Conta(models.Model):
    nome = models.CharField(max_length=120)
    codigo = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return f"{self.codigo} - {self.nome}"
