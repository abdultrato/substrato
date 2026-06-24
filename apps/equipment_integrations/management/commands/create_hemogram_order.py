"""
Cria uma IntegrationOrder para uma requisicao de hemograma no EDAN H30.

Uso:
  python manage.py create_hemogram_order --request REQ-001 --equipment EQP-EDAN-H30

O numero de acesso impresso deve ser introduzido no aparelho (campo Sample ID / Accession).
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.clinical.models import LabRequest
from apps.equipment_integrations.models import (
    IntegrationEquipment,
    IntegrationOrder,
    IntegrationOrderItem,
)


class Command(BaseCommand):
    help = (
        "Liga uma requisicao de hemograma ao EDAN H30 criando uma IntegrationOrder.\n"
        "Imprime o numero de acesso a introduzir no aparelho (campo Sample ID)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--request",
            required=True,
            help="custom_id da requisicao laboratorial (ex: REQ-MZ-LAB-00001).",
        )
        parser.add_argument(
            "--equipment",
            required=True,
            help="custom_id do equipamento EDAN H30 (ex: EQP-EDAN-H30).",
        )

    def handle(self, *args, **options):
        request_id = options["request"].strip()
        equipment_id = options["equipment"].strip()

        request = (
            LabRequest.objects.filter(custom_id=request_id, deleted=False)
            .select_related("patient", "tenant")
            .first()
        )
        if request is None:
            raise CommandError(f"Requisicao '{request_id}' nao encontrada.")
        if request.type != LabRequest.Type.LABORATORY:
            raise CommandError("Esta requisicao nao e do tipo Laboratorial.")

        equipment = (
            IntegrationEquipment.objects.filter(custom_id=equipment_id, deleted=False)
            .select_related("tenant")
            .first()
        )
        if equipment is None:
            raise CommandError(
                f"Equipamento '{equipment_id}' nao encontrado.\n"
                "Crie-o primeiro: python manage.py setup_edan_h30pro"
            )
        if not equipment.active:
            raise CommandError("Equipamento inativo.")
        if equipment.tenant_id != request.tenant_id:
            raise CommandError("Equipamento e requisicao pertencem a tenants diferentes.")

        # Verifica se a requisicao tem itens de exame
        items = list(
            request.items.filter(deleted=False).select_related("exam").prefetch_related("exam__fields")
        )
        if not items:
            raise CommandError("A requisicao nao tem itens de exame.")

        # Filtra apenas itens laboratoriais (o EDAN H30 processa so lab exams)
        lab_items = [item for item in items if item.exam_id is not None]
        if not lab_items:
            raise CommandError("A requisicao nao tem exames laboratoriais (so exames medicos).")

        with transaction.atomic():
            order, order_created = IntegrationOrder.objects.get_or_create(
                equipment=equipment,
                request=request,
                deleted=False,
                defaults={
                    "tenant": request.tenant,
                    "custom_id": request.custom_id,
                    "status": IntegrationOrder.Status.PENDING,
                    "observation": (
                        f"Ordem criada para o EDAN H30. "
                        f"Paciente: {request.patient.name}."
                    ),
                },
            )

            items_created = 0
            for lab_item in lab_items:
                _, created = IntegrationOrderItem.objects.get_or_create(
                    order=order,
                    request_item=lab_item,
                    deleted=False,
                    defaults={"tenant": request.tenant},
                )
                if created:
                    items_created += 1

            if order_created:
                order.mark_sent()

        status_label = "criada" if order_created else "ja existia"
        self.stdout.write("")
        self.stdout.write("=" * 56)
        self.stdout.write("  ORDEM CRIADA — EDAN H30")
        self.stdout.write("=" * 56)
        self.stdout.write(f"  Requisicao  : {request.custom_id}")
        self.stdout.write(f"  Paciente    : {request.patient.name}")
        self.stdout.write(f"  Ordem       : {order.custom_id}  ({status_label})")
        self.stdout.write(f"  Itens       : {len(lab_items)} exame(s)")
        self.stdout.write(f"  Estado      : {order.get_status_display()}")
        self.stdout.write("=" * 56)
        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"  NUMERO DE ACESSO A INTRODUZIR NO APARELHO:"
            )
        )
        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(f"      {order.custom_id}")
        )
        self.stdout.write("")
        self.stdout.write(
            "  No EDAN H30: Menu > Sample > Sample ID > introduza o numero acima"
        )
        self.stdout.write(
            "  Depois coloque a amostra de sangue e inicie a analise."
        )
        self.stdout.write(
            "  Os resultados serao enviados automaticamente ao sistema via ASTM."
        )
        self.stdout.write("")
