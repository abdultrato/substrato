"""Semeia o catálogo padrão do laboratório (sectores, exames, painéis) por tenant.

Uso:
    python manage.py seed_lab_catalog                 # todos os tenants ativos
    python manage.py seed_lab_catalog --tenant local  # por identifier ou id
"""

from django.core.management.base import BaseCommand

from apps.clinical_laboratory.catalog import seed_catalog
from apps.tenants.models.tenant import Tenant


class Command(BaseCommand):
    help = "Cria sectores, exames e painéis padrão do laboratório para um ou todos os tenants."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", help="id ou identifier do tenant (omitir = todos os ativos)")

    def handle(self, *args, **options):
        tenant_ref = options.get("tenant")
        if tenant_ref:
            tenant = (
                Tenant.all_objects.filter(identifier=tenant_ref).first()
                or (Tenant.all_objects.filter(pk=tenant_ref).first() if str(tenant_ref).isdigit() else None)
            )
            if tenant is None:
                self.stderr.write(self.style.ERROR(f"Tenant não encontrado: {tenant_ref}"))
                return
            tenants = [tenant]
        else:
            tenants = list(Tenant.objects.all())

        if not tenants:
            self.stdout.write(self.style.WARNING("Nenhum tenant encontrado para semear."))
            return

        for tenant in tenants:
            stats = seed_catalog(tenant)
            self.stdout.write(self.style.SUCCESS(
                f"[{tenant.identifier}] sectores +{stats['sectors']}, "
                f"exames +{stats['tests']}, painéis +{stats['panels']}, "
                f"legados +{stats.get('legacy_tests', 0)} "
                f"(ignorados {stats.get('legacy_skipped', 0)})"
            ))
