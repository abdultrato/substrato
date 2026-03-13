from __future__ import annotations

from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand
from django.db import transaction


CANONICAL_GROUPS: list[str] = [
    # Admin
    "Administrador",
    # Operacao
    "Recepcionista",
    "Tecnico de Laboratorio",
    "Enfermeiro",
    "Medico",
    "Tecnico de Farmacia",
    "Medicina Ocupacional",
    "Contabilidade",
]


class Command(BaseCommand):
    help = "Cria/atualiza grupos base (RBAC). Administrador recebe todas as permissoes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--admin-only",
            action="store_true",
            help="Atualiza apenas o grupo Administrador (nao cria/atualiza os demais).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mostra o que faria sem alterar o banco.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        admin_only: bool = bool(options.get("admin_only"))
        dry_run: bool = bool(options.get("dry_run"))

        targets = ["Administrador"] if admin_only else CANONICAL_GROUPS

        for name in targets:
            group, created = Group.objects.get_or_create(name=name)
            if created:
                self.stdout.write(f"Grupo criado: {name}")
            else:
                self.stdout.write(f"Grupo ok: {name}")

            if name == "Administrador":
                total = Permission.objects.count()
                current = group.permissions.count()

                if dry_run:
                    self.stdout.write(
                        f"[dry-run] Administrador: {current}/{total} permissoes (nao alterado)."
                    )
                else:
                    group.permissions.set(Permission.objects.all())
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Administrador atualizado: {current} -> {total} permissoes."
                        )
                    )

