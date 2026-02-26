from django.db import models


class ConfiguracaoInquilino(models.Model):

    inquilino = models.OneToOneField(
        "inquilinos.Inquilino",
        on_delete=models.CASCADE,
        related_name="configuracao",
    )

    fuso_horario = models.CharField(max_length=50, default="Africa/Maputo")
    moeda = models.CharField(max_length=10, default="MZN")
    idioma = models.CharField(max_length=10, default="pt")

    def __str__(self):
        return self.inquilino.nome
