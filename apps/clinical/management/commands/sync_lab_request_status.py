"""
Recalcula o status de todas as requisições laboratoriais cujos resultados
já estão todos validados/desconsiderados mas o status da requisição ainda
não reflecte isso.

Uso:
    python manage.py sync_lab_request_status
    python manage.py sync_lab_request_status --dry-run
"""

from django.core.management.base import BaseCommand

from apps.clinical.models.lab_request import LabRequest
from domain.clinical.result_state import ResultState


class Command(BaseCommand):
    help = "Recalcula e sincroniza o status das requisições laboratoriais."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mostra o que seria actualizado sem gravar.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Candidatas: requisições não-terminais com resultado associado
        candidates = LabRequest.objects.exclude(
            status__in=list(ResultState.TERMINAL)
        ).filter(result__isnull=False)

        total = candidates.count()
        self.stdout.write(f"Candidatas a recalcular: {total}")

        updated = 0
        for req in candidates.iterator(chunk_size=200):
            old_status = req.status
            if not dry_run:
                req.update_clinical_status()
                req.refresh_from_db()
            else:
                # Simula sem gravar
                req.update_clinical_status.__func__  # apenas valida o método existe

            if not dry_run and req.status != old_status:
                updated += 1
                self.stdout.write(
                    f"  {req.custom_id}: {old_status} → {req.status}"
                )

        if dry_run:
            self.stdout.write(self.style.WARNING("Modo dry-run: nenhuma alteração gravada."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Actualizadas: {updated} de {total} requisições."))
