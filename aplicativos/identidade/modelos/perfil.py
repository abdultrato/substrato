from django.conf import settings
from django.db import models


class PerfilProfissional(models.Model):
    """
    Informações profissionais vinculadas ao usuário.
    """

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="perfil",
    )

    cargo = models.CharField(max_length=120)
    registro_profissional = models.CharField(
        max_length=120,
        blank=True,
    )

    departamento = models.CharField(
        max_length=120,
        blank=True,
    )

    ativo = models.BooleanField(default=True)

    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Perfil Profissional"
        verbose_name_plural = "Perfis Profissionais"
        indexes = [
            models.Index(fields=["cargo"]),
            models.Index(fields=["departamento"]),
        ]

    def __str__(self):
        return f"{self.usuario} - {self.cargo}"
