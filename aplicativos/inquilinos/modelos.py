from django.db import models

class Inquilino(models.Model):
    nome = models.CharField(max_length=255)
    identificador = models.SlugField(unique=True)

    dominio = models.CharField(max_length=255, blank=True)
    ativo = models.BooleanField(default=True)

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome


class ConfiguracaoInquilino(models.Model):
    inquilino = models.OneToOneField(
        Inquilino,
        on_delete=models.CASCADE,
        related_name="configuracao"
    )

    fuso_horario = models.CharField(max_length=50, default="Africa/Maputo")
    moeda = models.CharField(max_length=10, default="MZN")
    idioma = models.CharField(max_length=10, default="pt")

    def __str__(self):
        return self.inquilino.nome
