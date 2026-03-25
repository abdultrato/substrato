from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.tenants.models.tenant import Tenant
from core.models import CoreModel


class User(AbstractUser, CoreModel):
    # AbstractUser já traz `first_name` e `last_name`, mas definimos verbose_name
    # em PT para UI/admin e consistência do projeto.
    first_name = models.CharField(
        "Nome",
        max_length=150,
        blank=True,
    )
    last_name = models.CharField(
        "Apelido",
        max_length=150,
        blank=True,
    )

    email = models.EmailField(unique=True, verbose_name="E-mail")

    phone = models.CharField(

        db_column="telefone",

        max_length=20, blank=True, null=True, verbose_name="Telefone")

    photo = models.ImageField(

        db_column="foto",

        upload_to="users/fotos/",
        blank=True,
        null=True,
        verbose_name="Foto de perfil",
    )
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"
        ordering = ["username"]

    def save(self, *args, **kwargs):
        # Política: superuser deve ser exceção (ignora RBAC e atravessa tenants).
        #
        # Exceções permitidas:
        # - allowlist explícita (variável SUBSTRATO_SUPERUSER_ALLOWLIST)
        # - membros do grupo RBAC "Administrador"
        allowlist = set(getattr(settings, "SUPERUSER_ALLOWLIST", []) or [])
        is_admin_group = False
        if getattr(self, "pk", None):
            try:
                from security.permissions.rbac import GROUPS as RBAC_GROUPS

                is_admin_group = self.groups.filter(name=RBAC_GROUPS["ADMIN"]).exists()
            except Exception:
                is_admin_group = False

        if getattr(self, "is_superuser", False) and (self.username not in allowlist) and (not is_admin_group):
            self.is_superuser = False

        # Garantir associação a um tenant mesmo em ambientes sem contexto (ex.: createsuperuser)
        if not self.tenant_id:
            tenant = Tenant.objects.order_by("id").first()
            if tenant:
                self.tenant = tenant
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username
