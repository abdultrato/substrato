from django.db import models


class PerfilProfissional(models.Model):
    usuario = models.OneToOneField(
        "identidade.Usuario",
        on_delete=models.CASCADE,
        related_name="perfil_profissional",
        db_index=True,
    )

    cargo = models.CharField(max_length=120, blank=True, default="")
    registro_profissional = models.CharField(max_length=120, blank=True, default="")
    departamento = models.CharField(max_length=120, blank=True, default="")

    ativo = models.BooleanField(default=True, db_index=True)

    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Perfil Profissional"
        verbose_name_plural = "Perfis Profissionais"
        indexes = [
            models.Index(fields=["usuario"]),
            models.Index(fields=["ativo"]),
        ]

    def __str__(self) -> str:
        return f"{self.usuario_id} - {self.cargo}".strip()

