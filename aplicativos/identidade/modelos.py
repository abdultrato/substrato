from django.db import models

# Create your models here.
from django.contrib.auth.models import AbstractUser
from django.db import models

class Usuario(AbstractUser):
    email = models.EmailField(unique=True)

    telefone = models.CharField(max_length=20, blank=True)
    ativo = models.BooleanField(default=True)

    data_criacao = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"

    def __str__(self):
        return self.get_full_name() or self.username


class PerfilProfissional(models.Model):
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.CASCADE,
        related_name="perfil"
    )

    cargo = models.CharField(max_length=120)
    registro_profissional = models.CharField(max_length=120, blank=True)

    class Meta:
        verbose_name = "Perfil Profissional"

    def __str__(self):
        return f"{self.usuario} - {self.cargo}"


class Funcao(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    descricao = models.TextField(blank=True)

    def __str__(self):
        return self.nome


class UsuarioFuncao(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    funcao = models.ForeignKey(Funcao, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("usuario", "funcao")


