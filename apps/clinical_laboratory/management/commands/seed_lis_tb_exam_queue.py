"""Cria dados de demonstração para as filas BAAR e molecular/GeneXpert.

Uso:
    python manage.py seed_lis_tb_exam_queue
    python manage.py seed_lis_tb_exam_queue --tenant local --clear
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.clinical_laboratory.catalog import seed_catalog
from apps.clinical_laboratory.models import (
    LabOrder,
    LabOrderItem,
    LabPriority,
    LabSample,
    LabTest,
    SampleCollection,
    SampleType,
)
from apps.tenants.models import Tenant
from core.constants.document_types import DocumentType
from core.constants.gender import Gender
from core.constants.provenance import Provenance


SEED_TAG = "SEED-LIS-TB"
ORIGIN = "SEED_TB_DEMO"


class Command(BaseCommand):
    help = "Cria pacientes, pedidos, itens e amostras pendentes para BAAR e GeneXpert/molecular."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", help="id ou identifier do tenant (default: primeiro tenant ativo)")
        parser.add_argument("--count", type=int, default=4, help="Número de pedidos a criar (mínimo 2; default: 4)")
        parser.add_argument("--clear", action="store_true", help="Remove dados anteriores deste seed antes de recriar")

    def handle(self, *args, **options):
        tenant = self._resolve_tenant(options.get("tenant"))
        count = max(2, int(options["count"] or 4))

        with transaction.atomic():
            if options["clear"]:
                removed_orders, removed_patients = self._clear(tenant)
                self.stdout.write(self.style.WARNING(
                    f"[{tenant.identifier}] removidos {removed_orders} pedidos e {removed_patients} pacientes do seed."
                ))

            seed_catalog(tenant)
            tests = self._tests(tenant)
            created = self._create_queue_data(tenant, tests, count)

        self.stdout.write(self.style.SUCCESS(
            f"[{tenant.identifier}] dados criados/garantidos: "
            f"{created['orders']} pedidos, {created['items']} itens, {created['samples']} amostras. "
            "As páginas /clinical-laboratory/afb-smears/new/ e /clinical-laboratory/molecular/ já têm candidatos."
        ))

    def _resolve_tenant(self, tenant_ref):
        if tenant_ref:
            tenant = (
                Tenant.all_objects.filter(identifier=tenant_ref).first()
                or (Tenant.all_objects.filter(pk=tenant_ref).first() if str(tenant_ref).isdigit() else None)
            )
        else:
            tenant = Tenant.objects.order_by("pk").first()
        if tenant is None:
            raise CommandError("Nenhum tenant encontrado. Crie um tenant ou informe --tenant.")
        return tenant

    def _clear(self, tenant):
        orders = LabOrder.all_objects.filter(tenant=tenant, origin=ORIGIN)
        order_count = orders.count()
        orders.hard_delete()
        patients = Patient.all_objects.filter(tenant=tenant, document_number__startswith=f"{SEED_TAG}-")
        patient_count = patients.count()
        patients.hard_delete()
        return order_count, patient_count

    def _tests(self, tenant):
        tests = {
            "BAAR": (
                LabTest.objects.filter(tenant=tenant, code__iexact="BAAR").first()
                or LabTest.objects.filter(tenant=tenant, name__icontains="Baciloscopia").first()
            ),
            "GENEXP": (
                LabTest.objects.filter(tenant=tenant, code__iexact="GENEXP").first()
                or LabTest.objects.filter(tenant=tenant, name__icontains="GeneXpert").first()
                or LabTest.objects.filter(tenant=tenant, name__icontains="Genexpert").first()
                or LabTest.objects.filter(tenant=tenant, name__icontains="Xpert").first()
            ),
        }
        missing = [code for code, test in tests.items() if test is None]
        if missing:
            raise CommandError(f"Exames não encontrados após seed_catalog: {', '.join(missing)}")
        return tests

    def _patient(self, tenant, index):
        document_number = f"{SEED_TAG}-{index:03d}"
        patient, _ = Patient.objects.update_or_create(
            tenant=tenant,
            document_number=document_number,
            defaults={
                "name": [
                    "Marta Chissano Macamo",
                    "Abel Mondlane Cossa",
                    "Lúcia Tembe Matsinhe",
                    "Nasser Mussa Issufo",
                    "Helena Chale Mabunda",
                    "Paulo Nhantumbo Langa",
                ][(index - 1) % 6],
                "gender": Gender.FEMALE if index % 2 else Gender.MALE,
                "birth_date": timezone.localdate() - timedelta(days=(28 + index * 7) * 365),
                "document_type": DocumentType.BI,
                "provenance": Provenance.CLINICA_EXTERNA,
                "contact": f"+258 84 55{index:02d} {index:03d}",
                "address_city": "Maputo",
                "address_province": "Maputo Cidade",
                "address_neighborhood": "Mavalane",
            },
        )
        return patient

    def _create_queue_data(self, tenant, tests, count):
        now = timezone.now()
        stats = {"orders": 0, "items": 0, "samples": 0}

        for index in range(1, count + 1):
            patient = self._patient(tenant, index)
            is_baar = index % 2 == 1
            test = tests["BAAR" if is_baar else "GENEXP"]
            sample_status = [
                LabSample.Status.RECEIVED,
                LabSample.Status.ACCEPTED,
                LabSample.Status.IN_PROCESSING,
            ][(index - 1) % 3]
            barcode = f"{SEED_TAG}-{tenant.id}-{index:03d}"

            order, order_created = LabOrder.objects.update_or_create(
                tenant=tenant,
                origin=ORIGIN,
                clinical_indication=f"{SEED_TAG} candidato {'BAAR' if is_baar else 'GeneXpert'} {index:03d}",
                defaults={
                    "patient": patient,
                    "priority": LabPriority.URGENT if index == 1 else LabPriority.ROUTINE,
                    "diagnosis": "Suspeita de tuberculose pulmonar",
                    "status": LabOrder.Status.IN_LAB,
                    "payment_status": LabOrder.PaymentStatus.EXEMPT,
                    "requested_at": now - timedelta(hours=index * 3),
                },
            )
            if order_created:
                stats["orders"] += 1

            item, item_created = LabOrderItem.objects.update_or_create(
                tenant=tenant,
                order=order,
                defaults={
                    "test": test,
                    "sample_type": SampleType.SPUTUM,
                    "price": test.price if getattr(test, "price", None) is not None else Decimal("0.00"),
                    "status": LabOrderItem.Status.RECEIVED,
                    "billed": False,
                },
            )
            if item_created:
                stats["items"] += 1

            collection, _ = SampleCollection.objects.update_or_create(
                tenant=tenant,
                order=order,
                barcode=barcode,
                defaults={
                    "patient": patient,
                    "collection_at": now - timedelta(hours=index * 2),
                    "location": "Sala de colheita respiratória",
                    "sample_type": SampleType.SPUTUM,
                    "container_type": "ESCARRO",
                    "status": SampleCollection.Status.SENT,
                    "notes": "Amostra respiratória criada para fila BAAR/GeneXpert.",
                },
            )

            _, sample_created = LabSample.objects.update_or_create(
                tenant=tenant,
                barcode=barcode,
                defaults={
                    "order": order,
                    "collection": collection,
                    "sample_type": SampleType.SPUTUM,
                    "container_type": "ESCARRO",
                    "condition": LabSample.Condition.ADEQUATE,
                    "status": sample_status,
                    "collected_at": now - timedelta(hours=index * 2),
                    "received_at": now - timedelta(hours=index),
                    "storage_location": "Bancada TB",
                },
            )
            if sample_created:
                stats["samples"] += 1

        return stats
