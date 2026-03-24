from django.db import models


class ProfessionalProfile(models.Model):
    usuario = models.OneToOneField(
        "identidade.User",
        verbose_name="Usuário",
        on_delete=models.CASCADE,
        related_name="perfil_profissional",
        db_index=True,
    )

    funcionario = models.OneToOneField(
        "recursos_humanos.Employee",
        verbose_name="Funcionário (RH)",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="perfil_profissional_rh",
        db_index=True,
    )

    cargo = models.CharField(verbose_name="Cargo", max_length=120, blank=True, default="")
    registro_profissional = models.CharField(
        verbose_name="Registro profissional",
        max_length=120,
        blank=True,
        default="",
    )
    departamento = models.CharField(verbose_name="Departamento", max_length=120, blank=True, default="")

    ativo = models.BooleanField(verbose_name="Ativo", default=True, db_index=True)

    criado_em = models.DateTimeField(verbose_name="Criado em", auto_now_add=True, db_index=True)
    atualizado_em = models.DateTimeField(verbose_name="Atualizado em", auto_now=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Perfil Profissional"
        verbose_name_plural = "Perfis Profissionais"
        indexes = [
            models.Index(fields=["usuario"]),
            models.Index(fields=["funcionario"]),
            models.Index(fields=["ativo"]),
        ]

    def __str__(self) -> str:
        return f"{self.usuario_id} - {self.cargo}".strip()
