"""Semeia equipamentos laboratoriais para uso em CQ e rotinas do sistema.

Uso:
    python manage.py seed_lab_equipment
    python manage.py seed_lab_equipment --tenant local
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.equipment.models import Equipment
from apps.tenants.models.tenant import Tenant


LAB_EQUIPMENT = [
    {
        "name": "Analisador hematologico Mindray BC-6200",
        "serial_number": "LAB-HEM-MDR-6200",
        "manufacturer": "Mindray",
        "model": "BC-6200",
        "location": "Laboratorio - Hematologia",
        "responsible": "Responsavel tecnico do laboratorio",
    },
    {
        "name": "Analisador hematologico Sysmex XN-550",
        "serial_number": "LAB-HEM-SMX-XN550",
        "manufacturer": "Sysmex",
        "model": "XN-550",
        "location": "Laboratorio - Hematologia",
        "responsible": "Responsavel tecnico do laboratorio",
    },
    {
        "name": "Analisador bioquimico Roche Cobas c 311",
        "serial_number": "LAB-BIO-ROC-C311",
        "manufacturer": "Roche",
        "model": "Cobas c 311",
        "location": "Laboratorio - Bioquimica",
        "responsible": "Responsavel tecnico do laboratorio",
    },
    {
        "name": "Analisador imunologico Abbott Architect i1000SR",
        "serial_number": "LAB-IMU-ABB-I1000SR",
        "manufacturer": "Abbott",
        "model": "Architect i1000SR",
        "location": "Laboratorio - Imunologia",
        "responsible": "Responsavel tecnico do laboratorio",
    },
    {
        "name": "Centrifuga Hettich Rotina 380",
        "serial_number": "LAB-PRE-HET-380",
        "manufacturer": "Hettich",
        "model": "Rotina 380",
        "location": "Laboratorio - Pre-analitica",
        "responsible": "Responsavel tecnico do laboratorio",
    },
    {
        "name": "Microscopio Olympus CX23",
        "serial_number": "LAB-MIC-OLY-CX23",
        "manufacturer": "Olympus",
        "model": "CX23",
        "location": "Laboratorio - Microscopia",
        "responsible": "Responsavel tecnico do laboratorio",
    },
]


class Command(BaseCommand):
    help = "Cria equipamentos laboratoriais padrao para o catalogo central de equipamentos."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", help="id ou identifier do tenant (omitir = todos os ativos)")

    def handle(self, *args, **options):
        tenants = self._resolve_tenants(options.get("tenant"))
        if not tenants:
            self.stdout.write(self.style.WARNING("Nenhum tenant encontrado para semear."))
            return

        for tenant in tenants:
            created = 0
            updated = 0
            for item in LAB_EQUIPMENT:
                equipment, was_created = Equipment.objects.update_or_create(
                    tenant=tenant,
                    serial_number=item["serial_number"],
                    defaults={
                        **item,
                        "acquisition_status": Equipment.AcquisitionStatus.NEW,
                        "initial_operational_status": Equipment.OperationalStatus.WORKING,
                        "initial_failure_type": "",
                        "active": True,
                    },
                )
                created += int(was_created)
                updated += int(not was_created and bool(equipment.pk))

            self.stdout.write(
                self.style.SUCCESS(
                    f"[{tenant.identifier}] equipamentos laboratoriais +{created}, atualizados {updated}"
                )
            )

    def _resolve_tenants(self, tenant_ref: str | None) -> list[Tenant]:
        if tenant_ref:
            tenant = (
                Tenant.all_objects.filter(identifier=tenant_ref).first()
                or (Tenant.all_objects.filter(pk=tenant_ref).first() if str(tenant_ref).isdigit() else None)
            )
            if tenant is None:
                self.stderr.write(self.style.ERROR(f"Tenant nao encontrado: {tenant_ref}"))
                return []
            return [tenant]
        return list(Tenant.objects.all())
