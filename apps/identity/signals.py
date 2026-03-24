from __future__ import annotations

from django.conf import settings
from django.db.models.signals import m2m_changed
from django.dispatch import receiver

from security.permissions.rbac import GROUPS as RBAC_GROUPS

from .models.user import User


def _superuser_allowlist() -> set[str]:
    try:
        return set(getattr(settings, "SUPERUSER_ALLOWLIST", []) or [])
    except Exception:
        return set()


def _admin_group_name() -> str:
    # Prefer the canonical RBAC name; fallback keeps dev resilient.
    try:
        return str(RBAC_GROUPS["ADMIN"])
    except Exception:
        return "Administrador"


@receiver(m2m_changed, sender=User.groups.through)
def sincronizar_admin_staff_superuser(sender, instance, action, reverse, model, pk_set=None, **kwargs):
    """
    Política do projeto:
    - Membros do grupo "Administrador" devem ter acesso total ao Django Admin.
      Portanto, garantimos `is_staff=True` e `is_superuser=True`.
    - Ao remover do grupo Administrador, removemos `is_superuser` (exceto allowlist)
      para evitar privilégios residuais.
    """

    if action not in {"post_add", "post_remove", "post_clear"}:
        return

    admin_group = _admin_group_name()
    allowlist = _superuser_allowlist()

    def _promover(u: User) -> None:
        fields: list[str] = []
        if getattr(u, "is_active", True) is False:
            u.is_active = True
            fields.append("is_active")
        if getattr(u, "is_staff", False) is False:
            u.is_staff = True
            fields.append("is_staff")
        if getattr(u, "is_superuser", False) is False:
            u.is_superuser = True
            fields.append("is_superuser")
        if fields:
            u.save(update_fields=fields)

    def _rebaixar(u: User) -> None:
        # Não rebaixa superusers "explicitamente" allowlisted (ex.: break-glass accounts).
        if getattr(u, "username", "") in allowlist:
            return
        fields: list[str] = []
        if getattr(u, "is_superuser", False) is True:
            u.is_superuser = False
            fields.append("is_superuser")
        # Política do projeto: Administrador acessa /admin.
        if getattr(u, "is_staff", False) is True:
            u.is_staff = False
            fields.append("is_staff")
        if fields:
            u.save(update_fields=fields)

    # reverse=False: instance é Usuario, model é Group
    if not reverse:
        user = instance
        if not getattr(user, "pk", None):
            return

        try:
            is_admin = user.groups.filter(name=admin_group).exists()
        except Exception:
            return

        if is_admin:
            _promover(user)
            return

        if action in {"post_remove", "post_clear"}:
            _rebaixar(user)

        return

    # reverse=True: instance é Group, model é Usuario
    group = instance
    if getattr(group, "name", None) != admin_group:
        return

    # post_clear não fornece pk_set (não sabemos quais utilizadores foram removidos).
    if not pk_set:
        return

    qs = model.objects.filter(pk__in=list(pk_set))
    if action == "post_add":
        for u in qs:
            _promover(u)
    elif action == "post_remove":
        for u in qs:
            _rebaixar(u)
