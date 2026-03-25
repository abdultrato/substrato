from django.db import models


class ProfessionalProfile(models.Model):
    user = models.OneToOneField(
        "identidade.User",
        db_column="user_id",
        verbose_name="Usuário",
        on_delete=models.CASCADE,
        related_name="perfil_professional",
        db_index=True,
    )

    employee = models.OneToOneField(

        "recursos_humanos.Employee",

        db_column="employee_id",
        verbose_name="Funcionário (RH)",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="perfil_professional_rh",
        db_index=True,
    )

    role = models.CharField(

        db_column="role",

        verbose_name="Cargo", max_length=120, blank=True, default="")
    professional_registration = models.CharField(
        db_column="professional_registration",
        verbose_name="Registro professional",
        max_length=120,
        blank=True,
        default="",
    )
    department = models.CharField(
        db_column="department",
        verbose_name="Departamento", max_length=120, blank=True, default="")

    active = models.BooleanField(

        db_column="active",

        verbose_name="Ativo", default=True, db_index=True)

    created_at = models.DateTimeField(verbose_name="Criado em", db_column="created_at", auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(verbose_name="Atualizado em", db_column="updated_at", auto_now=True)

    class Meta:
        db_table = "identidade_perfilprofissional"
        ordering = ["-created_at"]
        verbose_name = "Perfil Profissional"
        verbose_name_plural = "Perfis Profissionais"
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["employee"]),
            models.Index(fields=["active"]),
        ]

    def __str__(self) -> str:
        return f"{self.user_id} - {self.role}".strip()
