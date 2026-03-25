from __future__ import annotations

import unicodedata

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.tenants.models.tenant import Tenant
from security.permissions.rbac import GROUPS as RBAC_GROUPS


def _normalize(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn")


def _ensure_tenant() -> Tenant:
    tenant = Tenant.objects.order_by("id").first()
    if tenant:
        return tenant

    # Mirror bootstrap defaults: smooth dev bootstrap.
    return Tenant.objects.create(
        name="Tenant Local",
        identifier="local",
        domain="localhost",
        active=True,
        commercial_status=Tenant.CommercialStatus.TRIAL,
    )


def _resolve_group_name(group_input: str) -> str:
    raw = (group_input or "").strip()
    if not raw:
        raise CommandError("--group é obrigatório.")

    # Accept keys (ADMIN, RECEPCAO...) or the final human name ("Recepcionista").
    key = raw.upper()
    if key in RBAC_GROUPS:
        return RBAC_GROUPS[key]

    by_norm_name = {_normalize(v): v for v in RBAC_GROUPS.values()}
    normalized = _normalize(raw)
    if normalized in by_norm_name:
        return by_norm_name[normalized]

    allowed = ", ".join(sorted(RBAC_GROUPS.keys()))
    raise CommandError(
        f"Grupo inválido: {raw!r}. Use uma das chaves: {allowed} "
        f"(ou o name exato do grupo, ex.: {RBAC_GROUPS['RECEPCAO']!r})."
    )


class Command(BaseCommand):
    help = "Cria/atualiza um usuário com senha e grupo RBAC (exatos do sistema)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--list-groups",
            action="store_true",
            help="Lista os grupos RBAC disponíveis e termina.",
        )

        parser.add_argument("--username", help="Username (login).")
        parser.add_argument("--password", help="Senha (use com cuidado; fica no histórico do terminal).")
        parser.add_argument("--name", help="Nome completo (campo corporativo).")
        parser.add_argument("--first-name", dest="first_name", help="Nome (primeiro name).")
        parser.add_argument("--last-name", dest="last_name", help="Apelido (último name).")
        parser.add_argument("--email", help="E-mail (obrigatório; se omitido usa <username>@local).")
        parser.add_argument("--phone", help="Telefone (opcional).")

        parser.add_argument(
            "--group",
            help="Grupo RBAC (key: ADMIN/RECEPCAO/... ou o name do grupo).",
        )

        parser.add_argument(
            "--exclusive",
            action="store_true",
            help="Remove o usuário de outros grupos RBAC e mantém o informado.",
        )

        parser.add_argument(
            "--reset-password",
            action="store_true",
            help="Se o usuário já existir, redefine a senha.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options.get("list_groups"):
            self.stdout.write("Grupos RBAC disponíveis:")
            for key, name in RBAC_GROUPS.items():
                self.stdout.write(f"- {key}: {name}")
            return

        username = (options.get("username") or "").strip()
        if not username:
            raise CommandError("--username é obrigatório.")

        group_name = _resolve_group_name(options.get("group") or "")

        password = options.get("password")
        if not password:
            raise CommandError("--password é obrigatório.")

        name = (options.get("name") or "").strip()
        if not name:
            # `name` vem do NomeMixin (obrigatório no model).
            raise CommandError("--name é obrigatório (name completo).")

        email = (options.get("email") or "").strip() or f"{username}@local"
        first_name = (options.get("first_name") or "").strip()
        last_name = (options.get("last_name") or "").strip()
        phone = (options.get("phone") or "").strip() or None

        # Conveniência: se não vier first/last, tenta derivar do name completo.
        if not first_name and not last_name and name:
            parts = [p for p in name.split(" ") if p.strip()]
            if parts:
                first_name = parts[0]
                last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        tenant = _ensure_tenant()

        # Garantir que o grupo existe (com o name exato definido em RBAC).
        group, _ = Group.objects.get_or_create(name=group_name)

        User = get_user_model()
        user = User.objects.filter(username=username).first()

        is_admin_group = group_name == RBAC_GROUPS["ADMIN"]

        # Política do projeto: ADMIN tem acesso ao /admin.
        desired_staff = bool(is_admin_group)
        # Superuser é controlado por allowlist; mesmo se True, o model pode forçar False.
        desired_superuser = bool(is_admin_group)

        created = False
        if not user:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                name=name,
                first_name=first_name or "",
                last_name=last_name or "",
                phone=phone,
                is_active=True,
                is_staff=desired_staff,
                is_superuser=desired_superuser,
                tenant=tenant,
            )
            created = True
        else:
            fields_to_update: list[str] = []

            # Update only what was provided.
            if email and getattr(user, "email", "") != email:
                user.email = email
                fields_to_update.append("email")
            if name and getattr(user, "name", "") != name:
                user.name = name
                fields_to_update.append("name")
            if first_name and getattr(user, "first_name", "") != first_name:
                user.first_name = first_name
                fields_to_update.append("first_name")
            if last_name and getattr(user, "last_name", "") != last_name:
                user.last_name = last_name
                fields_to_update.append("last_name")
            if phone != getattr(user, "phone", None):
                user.phone = phone
                fields_to_update.append("phone")

            if not getattr(user, "tenant_id", None):
                user.tenant = tenant
                fields_to_update.append("tenant")

            if getattr(user, "is_staff", False) != desired_staff:
                user.is_staff = desired_staff
                fields_to_update.append("is_staff")
            if getattr(user, "is_superuser", False) != desired_superuser:
                user.is_superuser = desired_superuser
                fields_to_update.append("is_superuser")
            if getattr(user, "is_active", True) is False:
                user.is_active = True
                fields_to_update.append("is_active")

            if options.get("reset_password"):
                user.set_password(password)
                fields_to_update.append("password")

            if fields_to_update:
                user.save(update_fields=fields_to_update)

        if options.get("exclusive"):
            # Remove other RBAC groups to avoid mixed roles.
            rbac_group_names = list(RBAC_GROUPS.values())
            other_groups = Group.objects.filter(name__in=rbac_group_names).exclude(name=group.name)
            if other_groups.exists():
                user.groups.remove(*list(other_groups))

        user.groups.add(group)

        if not settings.DEBUG:
            self.stderr.write(
                "Aviso: comando destinado a desenvolvimento/demos. "
                "Em produção, use processos de credenciais apropriados."
            )

        action = "criado" if created else "atualizado"
        self.stdout.write(f"Usuário {action}: {user.username}")
        self.stdout.write(f"- Nome: {getattr(user, 'name', '')}")
        self.stdout.write(f"- E-mail: {getattr(user, 'email', '')}")
        self.stdout.write(f"- Grupo: {group.name}")
        self.stdout.write(f"- Staff (/admin): {'SIM' if getattr(user, 'is_staff', False) else 'NÃO'}")
        self.stdout.write(
            f"- Superuser: {'SIM' if getattr(user, 'is_superuser', False) else 'NÃO'} (pode ser forçado por allowlist)"
        )
