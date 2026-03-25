from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand

from apps.tenants.models.tenant import Tenant


class Command(BaseCommand):
    help = "Cria tenant e superuser padrão para desenvolvimento local (DEBUG)."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--email", default="admin@local")
        parser.add_argument("--password", default="admin123")

    def handle(self, *args, **options):
        if not settings.DEBUG:
            self.stderr.write("Este comando é destinado ao modo DEBUG.")
            return

        username = options["username"]
        email = options["email"]
        password = options["password"]

        tenant = Tenant.objects.order_by("id").first()
        if not tenant:
            tenant = Tenant.objects.create(
                name="Tenant Local",
                identifier="local",
                domain="localhost",
                active=True,
                commercial_status=Tenant.CommercialStatus.TRIAL,
            )

        User = get_user_model()
        user = User.objects.filter(username=username).first()
        created = False
        if not user:
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
                tenant=tenant,
            )
            created = True

        grupo_admin, _ = Group.objects.get_or_create(name="Administrador")
        # Garantir que o grupo Administrador sempre tenha acesso total.
        grupo_admin.permissions.set(Permission.objects.all())
        user.groups.add(grupo_admin)

        self.stdout.write(f"Tenant: {tenant.id} {tenant.identifier} ({tenant.name})")
        if created:
            self.stdout.write(f"Superuser criado: {username} / {password}")
        else:
            self.stdout.write(f"Superuser já existia: {username} (senha não alterada)")
