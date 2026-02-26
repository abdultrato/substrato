from django.contrib.auth.models import AbstractUser
from django.db import models

from aplicativos.identidade.gerentes import UsuarioManager


class Usuario(AbstractUser):

    username = None  # remove username

    email = models.EmailField(unique=True)

    telefone = models.CharField(max_length=20, blank=True)
    ativo = models.BooleanField(default=True)

    data_criacao = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UsuarioManager()

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"

    def __str__(self):
        return self.get_full_name() or self.email
