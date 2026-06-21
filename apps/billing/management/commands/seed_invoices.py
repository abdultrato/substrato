"""Seed de faturas hipotéticas a partir das consultas e pacientes existentes.

Não requer broker Celery — cria faturas e pagamentos directamente via ORM,
sem `@transaction.atomic` global e sem disparar tarefas assíncronas.

Uso:
    python manage.py seed_invoices                  # tenant do 1.º superuser
    python manage.py seed_invoices --tenant 2
    python manage.py seed_invoices --count 50
    python manage.py seed_invoices --clear          # apaga faturas seed antes
"""

from __future__ import annotations

import random
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

SEED_TAG = "SEED-INV"


class Command(BaseCommand):
    help = "Gera faturas de demonstração a partir das consultas e pacientes existentes."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", type=int, default=None, help="ID do tenant (default: o primeiro).")
        parser.add_argument("--count", type=int, default=40, help="Número de faturas a criar (default: 40).")
        parser.add_argument("--clear", action="store_true", help="Remove faturas seed anteriores antes de criar.")

    def handle(self, *args, **options):
        from apps.billing.models.invoice import Invoice
        from apps.consultations.models.medical_consultation import MedicalConsultation
        from apps.payments.models.payment import Payment
        from apps.tenants.models.tenant import Tenant

        tenant_id = options["tenant"]
        count = options["count"]
        do_clear = options["clear"]

        if tenant_id:
            try:
                tenant = Tenant.objects.get(pk=tenant_id)
            except Tenant.DoesNotExist:
                raise CommandError(f"Tenant com id={tenant_id} não encontrado.")
        else:
            tenant = Tenant.objects.order_by("id").first()
            if not tenant:
                raise CommandError("Nenhum tenant disponível. Execute seed_demo ou crie um tenant primeiro.")

        if do_clear:
            deleted, _ = Invoice.objects.filter(
                tenant=tenant,
                custom_id__startswith=f"{SEED_TAG}-T{tenant.pk}-",
            ).delete()
            self.stdout.write(f"  {deleted} fatura(s) seed apagada(s).")

        consultations = list(
            MedicalConsultation.objects.filter(tenant=tenant)
            .select_related("patient")
            .order_by("?")[:count]
        )
        if not consultations:
            raise CommandError(
                "Nenhuma consulta encontrada neste tenant. "
                "Execute seed_consultations primeiro."
            )

        created = 0
        skipped = 0

        for idx, consultation in enumerate(consultations, start=1):
            patient = getattr(consultation, "patient", None)
            if not patient:
                skipped += 1
                continue

            # Skip if this consultation already has an invoice.
            if Invoice.objects.filter(consultation=consultation).exists():
                skipped += 1
                continue

            valor = Decimal(str(round(random.uniform(500, 8000), 2)))
            status_choices = [
                Invoice.Status.DRAFT,
                Invoice.Status.ISSUED,
                Invoice.Status.ISSUED,
                Invoice.Status.PAID,
                Invoice.Status.PAID,
                Invoice.Status.CANCELED,
            ]
            status = random.choice(status_choices)

            invoice = Invoice(
                tenant=tenant,
                patient=patient,
                consultation=consultation,
                origin=Invoice.Origin.CONSULTATION,
                status=status,
                total=valor,
                patient_amount=valor,
            )
            # Assign custom_id so we can find / clear seed records later.
            invoice.custom_id = f"{SEED_TAG}-T{tenant.pk}-{idx:05d}"
            invoice.save()

            # Create a confirmed payment for PAID invoices.
            if status == Invoice.Status.PAID:
                Payment.objects.create(
                    tenant=tenant,
                    invoice=invoice,
                    value=valor,
                    method=random.choice([
                        Payment.Method.CASH,
                        Payment.Method.TRANSFER,
                        Payment.Method.CARD,
                        Payment.Method.MOBILE_MONEY,
                    ]),
                    status=Payment.Status.CONFIRMED,
                    paid_at=timezone.now(),
                )

            created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed de faturas concluído: {created} criada(s), {skipped} ignorada(s). "
                f"Tenant: {tenant.pk} ({tenant.name or tenant.identifier})."
            )
        )
