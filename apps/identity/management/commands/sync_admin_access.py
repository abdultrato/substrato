from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction

from security.permissions.rbac import GROUPS as RBAC_GROUPS


class Command(BaseCommand):
    help = "Sincroniza acesso ao Django Admin: membros de 'Administrador' viram staff+superuser."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mostra o que faria sem alterar o banco.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run: bool = bool(options.get("dry_run"))

        admin_group_name = RBAC_GROUPS["ADMIN"]
        admin_group, _ = Group.objects.get_or_create(name=admin_group_name)

        User = get_user_model()
        allowlist = set(getattr(settings, "SUPERUSER_ALLOWLIST", []) or [])

        qs = User.objects.filter(groups__name=admin_group.name).distinct().order_by("username")

        changed = 0
        for u in qs:
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

            if not fields:
                continue

            changed += 1
            msg = f"{u.username}: {' '.join(fields)}"
            if dry_run:
                self.stdout.write(f"[dry-run] {msg}")
            else:
                u.save(update_fields=fields)
                self.stdout.write(f"OK {msg}")

        self.stdout.write(f"Grupo admin: {admin_group.name}")
        self.stdout.write(
            f"Allowlist superuser (SUBSTRATO_SUPERUSER_ALLOWLIST): {', '.join(sorted(allowlist)) or '(vazia)'}"
        )
        self.stdout.write(f"Utilizadores no grupo: {qs.count()}")
        self.stdout.write(f"Atualizados: {changed}{' (dry-run)' if dry_run else ''}")
