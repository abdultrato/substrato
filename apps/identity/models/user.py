from django.conf import settings
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

from apps.tenants.models.tenant import Tenant
from core.models import CoreModel


class IdentityUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        user = super().create_superuser(username, email=email, password=password, **extra_fields)
        self._ensure_admin_access(user)
        return user

    def _ensure_admin_access(self, user) -> None:
        try:
            from django.contrib.auth.models import Group
            from security.permissions.rbac import GROUPS as RBAC_GROUPS

            admin_group, _ = Group.objects.get_or_create(name=RBAC_GROUPS["ADMIN"])
            user.groups.add(admin_group)

            # Defensive: guarantee flags even if signals are not loaded.
            update_fields: list[str] = []
            if not getattr(user, "is_staff", False):
                user.is_staff = True
                update_fields.append("is_staff")
            if not getattr(user, "is_superuser", False):
                user.is_superuser = True
                update_fields.append("is_superuser")
            if update_fields:
                user.save(update_fields=update_fields)
        except Exception:
            # Mantem o createsuperuser resiliente mesmo sem RBAC pronto.
            return


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

        db_column="phone",

        max_length=20, blank=True, null=True, verbose_name="Telefone")

    photo = models.ImageField(

        db_column="photo",

        upload_to="users/fotos/",
        blank=True,
        null=True,
        verbose_name="Foto de perfil",
    )
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]
    objects = IdentityUserManager()

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"
        ordering = ["username"]

    def save(self, *args, **kwargs):
        # Garantir associação a um tenant mesmo em ambientes sem contexto (ex.: createsuperuser)
        if not self.tenant_id:
            tenant = Tenant.objects.order_by("id").first()
            if tenant:
                self.tenant = tenant
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username
