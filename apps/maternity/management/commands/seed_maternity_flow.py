"""Seed de jornada de maternidade e bercario para QA/demonstracao.

Cria pacientes gestantes, check-ins de recepcao, gestacoes em diferentes
semanas, partos/bercario e faturacao com pagamentos confirmados.

Uso:
    python manage.py seed_maternity_flow
    python manage.py seed_maternity_flow --tenant 1
    python manage.py seed_maternity_flow --clear
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.clinical.models.patient import BloodType, Patient
from apps.maternity.models.pregnancy import Pregnancy
from apps.payments.models.payment import Payment
from apps.reception.models.reception_checkin import ReceptionCheckin
from apps.tenants.models import Tenant
from core.constants.document_types import DocumentType
from core.constants.gender import Gender
from core.constants.provenance import Provenance
from core.constants.race_origin import RaceOrigin

SEED_TAG = "SEED-MAT"


@dataclass(frozen=True)
class MaternityCase:
    code: str
    patient_name: str
    document_number: str
    birth_date: date
    contact: str
    address_city: str
    address_neighborhood: str
    gestational_weeks: int
    bed: str
    nursery: str
    gravida_para: tuple[int, int, int]
    reason: str
    status: str
    cesarean: bool
    baby_name: str
    baby_sex: str
    birth_weight_g: int | None
    apgar: str
    invoice_status: str
    invoice_items: tuple[tuple[str, Decimal, Decimal, bool], ...]


def _aware(days_ago: int, hour: int, minute: int = 0):
    day = timezone.localdate() - timedelta(days=days_ago)
    return timezone.make_aware(datetime.combine(day, time(hour, minute)))


def _quant(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))


class Command(BaseCommand):
    help = "Cria dados hipoteticos de maternidade/bercario desde recepcao ate faturacao."

    cases = (
        MaternityCase(
            code="001",
            patient_name="Helena Muthemba Macamo",
            document_number=f"{SEED_TAG}-001",
            birth_date=date(1998, 3, 14),
            contact="+258841120001",
            address_city="Pemba",
            address_neighborhood="Natite",
            gestational_weeks=12,
            bed="OBS-03",
            nursery="Consulta pre-natal",
            gravida_para=(1, 0, 0),
            reason="Primeira consulta pre-natal, 12 semanas de gestacao.",
            status="follow_up",
            cesarean=False,
            baby_name="",
            baby_sex="",
            birth_weight_g=None,
            apgar="",
            invoice_status="issued",
            invoice_items=(
                ("Consulta pre-natal inicial", Decimal("1.00"), Decimal("1250.00"), False),
                ("Ecografia obstetrica 1.o trimestre", Decimal("1.00"), Decimal("2800.00"), False),
                ("Hemograma, grupo sanguineo e glicemia", Decimal("1.00"), Decimal("1450.00"), False),
            ),
        ),
        MaternityCase(
            code="002",
            patient_name="Nadia Chissano Massango",
            document_number=f"{SEED_TAG}-002",
            birth_date=date(1995, 8, 22),
            contact="+258861120002",
            address_city="Pemba",
            address_neighborhood="Paquitequete",
            gestational_weeks=28,
            bed="OBS-07",
            nursery="Pre-natal alto risco",
            gravida_para=(2, 1, 0),
            reason="Seguimento de 28 semanas com anemia ligeira.",
            status="follow_up",
            cesarean=False,
            baby_name="",
            baby_sex="",
            birth_weight_g=None,
            apgar="",
            invoice_status="draft",
            invoice_items=(
                ("Consulta obstetrica de seguimento", Decimal("1.00"), Decimal("1100.00"), False),
                ("Ecografia obstetrica 2.o trimestre", Decimal("1.00"), Decimal("3000.00"), False),
                ("Sulfato ferroso e acido folico", Decimal("1.00"), Decimal("650.00"), True),
            ),
        ),
        MaternityCase(
            code="003",
            patient_name="Fatima Issufo Langa",
            document_number=f"{SEED_TAG}-003",
            birth_date=date(1991, 11, 2),
            contact="+258871120003",
            address_city="Pemba",
            address_neighborhood="Cariaco",
            gestational_weeks=37,
            bed="MAT-04",
            nursery="Bercario A",
            gravida_para=(3, 2, 0),
            reason="Admissao por trabalho de parto, 37 semanas.",
            status="delivered",
            cesarean=False,
            baby_name="Amina Issufo",
            baby_sex="F",
            birth_weight_g=2920,
            apgar="8/9",
            invoice_status="paid",
            invoice_items=(
                ("Admissao e sala de parto normal", Decimal("1.00"), Decimal("6500.00"), False),
                ("Diaria maternidade - mae", Decimal("2.00"), Decimal("2200.00"), False),
                ("Cuidados imediatos ao recem-nascido", Decimal("1.00"), Decimal("1800.00"), False),
                ("Bercario A - observacao neonatal", Decimal("1.00"), Decimal("1500.00"), False),
                ("Medicacao e material obstetrico", Decimal("1.00"), Decimal("1350.00"), True),
            ),
        ),
        MaternityCase(
            code="004",
            patient_name="Rosa Mucavel Nuro",
            document_number=f"{SEED_TAG}-004",
            birth_date=date(1989, 6, 30),
            contact="+258821120004",
            address_city="Montepuez",
            address_neighborhood="Nacate",
            gestational_weeks=39,
            bed="MAT-01",
            nursery="Bercario B",
            gravida_para=(2, 1, 1),
            reason="Cesareana programada por cesareana anterior, 39 semanas.",
            status="closed",
            cesarean=True,
            baby_name="Mateus Nuro",
            baby_sex="M",
            birth_weight_g=3180,
            apgar="9/10",
            invoice_status="paid",
            invoice_items=(
                ("Cesareana obstetrica", Decimal("1.00"), Decimal("18500.00"), False),
                ("Anestesia raquidiana", Decimal("1.00"), Decimal("4200.00"), False),
                ("Diaria maternidade - mae", Decimal("3.00"), Decimal("2200.00"), False),
                ("Bercario B - cuidados neonatais", Decimal("2.00"), Decimal("1650.00"), False),
                ("Kit cirurgico obstetrico", Decimal("1.00"), Decimal("3750.00"), True),
            ),
        ),
        MaternityCase(
            code="005",
            patient_name="Jacinta Sitoe Mabunda",
            document_number=f"{SEED_TAG}-005",
            birth_date=date(2001, 1, 9),
            contact="+258851120005",
            address_city="Pemba",
            address_neighborhood="Eduardo Mondlane",
            gestational_weeks=40,
            bed="MAT-06",
            nursery="Bercario C",
            gravida_para=(1, 0, 0),
            reason="Parto normal eutocico, 40 semanas.",
            status="closed",
            cesarean=False,
            baby_name="Ester Mabunda",
            baby_sex="F",
            birth_weight_g=3360,
            apgar="8/10",
            invoice_status="paid",
            invoice_items=(
                ("Admissao e sala de parto normal", Decimal("1.00"), Decimal("6500.00"), False),
                ("Diaria maternidade - mae", Decimal("1.00"), Decimal("2200.00"), False),
                ("Bercario C - alojamento conjunto", Decimal("1.00"), Decimal("1200.00"), False),
                ("Teste rapido VIH/sifilis e glicemia", Decimal("1.00"), Decimal("900.00"), False),
            ),
        ),
    )

    def add_arguments(self, parser):
        parser.add_argument("--tenant", type=int, default=None, help="ID do tenant (default: primeiro tenant).")
        parser.add_argument("--clear", action="store_true", help="Remove dados deste seed antes de criar.")

    def handle(self, *args, **options):
        tenant = self._tenant(options["tenant"])

        with transaction.atomic():
            if options["clear"]:
                self._clear(tenant)

            created = 0
            skipped = 0
            for index, case in enumerate(self.cases, start=1):
                patient, was_created = self._patient(tenant, case)
                if not was_created and Pregnancy.objects.filter(tenant=tenant, patient=patient).exists():
                    skipped += 1
                    continue

                pregnancy = self._pregnancy(tenant, patient, case, index)
                checkin = self._checkin(tenant, patient, case, index)
                invoice = self._invoice(tenant, patient, case, index)
                checkin.register_invoice(invoice)
                checkin.complete()
                created += 1

                self.stdout.write(
                    f"  {case.document_number}: {patient.name} | {pregnancy.get_status_display()} | "
                    f"{invoice.custom_id} {invoice.get_status_display()} {invoice.total:.2f}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed maternidade/bercario concluido: {created} fluxo(s) criado(s), "
                f"{skipped} ignorado(s). Tenant: {tenant.pk} ({tenant.name or tenant.identifier})."
            )
        )

    def _tenant(self, tenant_id: int | None):
        tenant = Tenant.objects.filter(pk=tenant_id).first() if tenant_id else Tenant.objects.order_by("pk").first()
        if not tenant:
            raise CommandError("Nenhum tenant encontrado. Crie um tenant antes de correr o seed.")
        return tenant

    def _clear(self, tenant):
        patients = Patient.all_objects.filter(tenant=tenant, document_number__startswith=SEED_TAG)
        patient_ids = list(patients.values_list("id", flat=True))
        invoices = Invoice.all_objects.filter(tenant=tenant, patient_id__in=patient_ids)

        payments_deleted, _ = Payment.all_objects.filter(tenant=tenant, invoice__in=invoices).delete()
        invoice_items_deleted, _ = InvoiceItem.all_objects.filter(tenant=tenant, invoice__in=invoices).delete()
        checkins_deleted, _ = ReceptionCheckin.all_objects.filter(tenant=tenant, patient_id__in=patient_ids).delete()
        invoices_deleted, _ = invoices.delete()
        pregnancies_deleted, _ = Pregnancy.all_objects.filter(tenant=tenant, patient_id__in=patient_ids).delete()
        patients_deleted, _ = patients.delete()

        self.stdout.write(
            self.style.WARNING(
                "Removidos dados anteriores: "
                f"{patients_deleted} pacientes, {pregnancies_deleted} gestacoes, "
                f"{checkins_deleted} check-ins, {invoices_deleted} faturas, "
                f"{invoice_items_deleted} itens, {payments_deleted} pagamentos."
            )
        )

    def _patient(self, tenant, case: MaternityCase):
        patient, created = Patient.all_objects.get_or_create(
            document_number=case.document_number,
            defaults={
                "tenant": tenant,
                "name": case.patient_name,
                "gender": Gender.FEMALE,
                "birth_date": case.birth_date,
                "pregnant": case.status == "follow_up",
                "gestational_age_weeks": case.gestational_weeks if case.status == "follow_up" else None,
                "blood_type": BloodType.O_POSITIVE,
                "race_origin": RaceOrigin.BLACK,
                "document_type": DocumentType.BI,
                "address_street": "Av. 25 de Setembro",
                "address_number": case.code,
                "address_neighborhood": case.address_neighborhood,
                "address_city": case.address_city,
                "address_province": "Cabo Delgado",
                "address_postal_code": "5100",
                "address_country": "MZ",
                "contact": case.contact,
                "email": f"{case.document_number.lower()}@exemplo.local",
                "companion_name": f"Acompanhante {case.patient_name.split()[-1]}",
                "companion_relationship": "Familiar",
                "companion_contact": case.contact[:-1] + "9",
                "provenance": Provenance.MATERNIDADE,
            },
        )
        return patient, created

    def _pregnancy(self, tenant, patient, case: MaternityCase, index: int):
        lmp = timezone.localdate() - timedelta(weeks=case.gestational_weeks)
        expected_delivery = lmp + timedelta(days=280)
        total, normal, cesareans = case.gravida_para

        notes = [
            f"{SEED_TAG}: caso {case.code}.",
            "Fluxo de teste: recepcao -> maternidade -> bercario -> faturacao.",
            f"Idade gestacional na admissao: {case.gestational_weeks} semanas.",
        ]
        if case.baby_name:
            notes.append(
                f"RN: {case.baby_name}, sexo {case.baby_sex}, "
                f"{case.birth_weight_g} g, Apgar {case.apgar}."
            )

        pregnancy = Pregnancy.objects.create(
            tenant=tenant,
            patient=patient,
            last_menstrual_period_date=lmp,
            expected_delivery_date=expected_delivery,
            nursery=case.nursery,
            maternity_bed=case.bed,
            total_deliveries=total,
            normal_deliveries=normal,
            cesareans=cesareans,
            notes="\n".join(notes),
            created_at=_aware(28 - (index * 4), 9),
        )

        if case.status in {"delivered", "closed"}:
            pregnancy.register_delivery(cesarean=case.cesarean)
            if case.status == "closed":
                pregnancy.close()

        return pregnancy

    def _checkin(self, tenant, patient, case: MaternityCase, index: int):
        arrived_at = _aware(20 - (index * 3), 8, 15)
        return ReceptionCheckin.objects.create(
            tenant=tenant,
            patient=patient,
            priority=ReceptionCheckin.Priority.PREFERRED if case.gestational_weeks >= 37 else ReceptionCheckin.Priority.NORMAL,
            status=ReceptionCheckin.Status.IN_CARE,
            reason=case.reason,
            notes=f"{SEED_TAG}: entrada de maternidade caso {case.code}.",
            arrived_at=arrived_at,
            called_at=arrived_at + timedelta(minutes=12),
        )

    def _invoice(self, tenant, patient, case: MaternityCase, index: int):
        invoice = Invoice.objects.create(
            tenant=tenant,
            patient=patient,
            origin=Invoice.Origin.MIXED,
            fiscal_client_name=patient.name,
            fiscal_client_nuit=case.document_number,
            fiscal_client_address=patient.address,
        )

        for description, quantity, unit_price, applies_vat in case.invoice_items:
            InvoiceItem.objects.create(
                tenant=tenant,
                invoice=invoice,
                item_type=InvoiceItem.TipoItem.AJUSTE,
                description=description,
                quantity=quantity,
                unit_price=unit_price,
                applies_vat=applies_vat,
                vat_percentage=Decimal("16.00") if applies_vat else Decimal("0.00"),
            )

        invoice.refresh_from_db()
        invoice.persist_totals()

        if case.invoice_status in {"issued", "paid"}:
            invoice.issue()
            invoice.refresh_from_db()

        if case.invoice_status == "paid":
            payment = Payment.objects.create(
                tenant=tenant,
                name=f"Pagamento maternidade {case.code}",
                invoice=invoice,
                value=_quant(invoice.total),
                method=Payment.Method.MOBILE_MONEY if index % 2 else Payment.Method.CARD,
                status=Payment.Status.PENDING,
                external_reference=f"{SEED_TAG}-PAY-{case.code}",
            )
            payment.confirm()
            invoice.refresh_from_db()

        return invoice
