from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone


class Command(BaseCommand):
    help = (
        "Apaga (hard delete) ou desativa (recomendado) um usuário.\n\n"
        "Por padrão, desativa: is_active=False + is_staff/is_superuser=False, "
        "e marca como deletado quando o model possuir campos de soft-delete."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            help="Username do usuário a apagar/desativar (case-insensitive).",
        )
        parser.add_argument(
            "--email",
            help="E-mail do usuário (alternativa ao username; case-insensitive).",
        )
        parser.add_argument(
            "--hard",
            action="store_true",
            help="Apaga permanentemente do banco (hard delete).",
        )
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Não pede confirmação.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        username = (options.get("username") or "").strip()
        email = (options.get("email") or "").strip()
        hard = bool(options.get("hard"))
        yes = bool(options.get("yes"))

        if not username and not email:
            raise CommandError("Informe --username ou --email.")

        User = get_user_model()
        qs = User.objects.all()

        user = None
        if username:
            user = qs.filter(username__iexact=username).first()
        if user is None and email:
            user = qs.filter(email__iexact=email).first()

        if user is None:
            raise CommandError("Usuário não encontrado.")

        if hard:
            if not yes:
                self.stdout.write(
                    f"Vai APAGAR permanentemente: username={user.username!r} id={user.pk}"
                )
                confirm = input("Digite APAGAR para confirmar: ").strip()
                if confirm != "APAGAR":
                    self.stdout.write("Cancelado.")
                    return

            # Hard delete: remove o registo do banco.
            User.objects.filter(pk=user.pk).delete()
            self.stdout.write(self.style.SUCCESS(f"Usuário apagado: {user.username}"))
            return

        if not yes:
            self.stdout.write(
                f"Vai DESATIVAR: username={user.username!r} id={user.pk} "
                "(mantém o registo para auditoria/histórico)."
            )
            confirm = input("Digite DESATIVAR para confirmar: ").strip()
            if confirm != "DESATIVAR":
                self.stdout.write("Cancelado.")
                return

        # Soft/deactivate path
        now = timezone.now()
        update_fields: list[str] = []

        if getattr(user, "is_active", True) is not False:
            user.is_active = False
            update_fields.append("is_active")

        # Remove admin access flags defensivamente.
        if getattr(user, "is_staff", False) is not False:
            user.is_staff = False
            update_fields.append("is_staff")
        if getattr(user, "is_superuser", False) is not False:
            user.is_superuser = False
            update_fields.append("is_superuser")

        # Mark as "deletado" if this model has the soft-delete fields (CoreModel-based).
        if hasattr(user, "deletado") and getattr(user, "deletado", False) is not True:
            user.deletado = True
            update_fields.append("deletado")
        if hasattr(user, "deletado_em"):
            user.deletado_em = now
            update_fields.append("deletado_em")

        if update_fields:
            user.save(update_fields=update_fields)

        self.stdout.write(self.style.SUCCESS(f"Usuário desativado: {user.username}"))

