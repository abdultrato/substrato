"""Seed de demonstração do módulo de Saúde Pública.

Cria vacinas, lotes (incluindo lotes em risco), uma campanha ativa, registos de
imunização com reforços vencidos, um AEFI grave em investigação e notificações
oficiais pendentes — o suficiente para popular o dashboard e as listagens.

Idempotente: reexecutar não duplica registos (usa get_or_create por chave natural).

    python manage.py seed_public_health_demo
"""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.clinical.models import Patient
from apps.public_health.models import (
    AdverseEventFollowingImmunization,
    ImmunizationRecord,
    PublicHealthNotification,
    VaccinationCampaign,
    VaccinationCampaignTarget,
    VaccineLot,
    VaccineProduct,
)

VACCINES = [
    {"name": "BCG", "disease": "Tuberculose", "vaccine_type": VaccineProduct.VaccineType.LIVE_ATTENUATED,
     "manufacturer": "Serum Institute", "code": "BCG", "dose_count_required": 1, "booster_interval_days": 0},
    {"name": "Hepatite B", "disease": "Hepatite B", "vaccine_type": VaccineProduct.VaccineType.INACTIVATED,
     "manufacturer": "GSK", "code": "HEPB", "dose_count_required": 3, "booster_interval_days": 30},
    {"name": "VASPR (Sarampo-Papeira-Rubéola)", "disease": "Sarampo", "vaccine_type": VaccineProduct.VaccineType.LIVE_ATTENUATED,
     "manufacturer": "Merck", "code": "VASPR", "dose_count_required": 2, "booster_interval_days": 60},
    {"name": "COVID-19 mRNA", "disease": "COVID-19", "vaccine_type": VaccineProduct.VaccineType.MRNA,
     "manufacturer": "Pfizer-BioNTech", "code": "COVID", "dose_count_required": 2, "booster_interval_days": 45,
     "cold_chain_min_c": Decimal("-80.00"), "cold_chain_max_c": Decimal("-60.00")},
    {"name": "Gripe sazonal", "disease": "Influenza", "vaccine_type": VaccineProduct.VaccineType.INACTIVATED,
     "manufacturer": "Sanofi", "code": "FLU", "dose_count_required": 1, "booster_interval_days": 0},
]


class Command(BaseCommand):
    help = "Popula o módulo de Saúde Pública com dados de demonstração (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", type=int, default=None, help="ID do tenant (por omissão usa o primeiro).")

    @transaction.atomic
    def handle(self, *args, **options):
        today = timezone.localdate()
        now = timezone.now()

        tenant_model = VaccineProduct._meta.get_field("tenant").related_model
        if options["tenant"]:
            tenant = tenant_model.objects.filter(pk=options["tenant"]).first()
        else:
            tenant = tenant_model.objects.order_by("pk").first()
        if not tenant:
            raise CommandError("Nenhum tenant encontrado. Crie um tenant antes de correr o seed.")

        self.stdout.write(f"Tenant: {tenant} (#{tenant.pk})")

        # ── Vacinas ──────────────────────────────────────────────
        vaccines: dict[str, VaccineProduct] = {}
        for spec in VACCINES:
            defaults = {k: v for k, v in spec.items() if k != "code"}
            vaccine, created = VaccineProduct.objects.get_or_create(
                tenant=tenant, code=spec["code"], defaults=defaults
            )
            vaccines[spec["code"]] = vaccine
            self.stdout.write(f"  {'+' if created else '='} vacina {vaccine.name}")

        # ── Lotes (incluindo lotes em risco) ─────────────────────
        # (código do lote, vacina, dias até validade, doses_received, doses_available, cadeia fria, estado)
        lot_specs = [
            ("HEPB-2401", "HEPB", 365, 500, 480, VaccineLot.ColdChainStatus.OK, VaccineLot.Status.ACTIVE),
            ("HEPB-2312", "HEPB", 20, 200, 8, VaccineLot.ColdChainStatus.OK, VaccineLot.Status.ACTIVE),      # baixo stock + validade próxima
            ("VASPR-2405", "VASPR", 400, 300, 260, VaccineLot.ColdChainStatus.OK, VaccineLot.Status.ACTIVE),
            ("VASPR-2310", "VASPR", -5, 150, 120, VaccineLot.ColdChainStatus.OK, VaccineLot.Status.ACTIVE),  # expirado (auto EXPIRED)
            ("COVID-2404", "COVID", 180, 1000, 900, VaccineLot.ColdChainStatus.BREACH, VaccineLot.Status.ACTIVE),  # quebra de cadeia fria
            ("COVID-2402", "COVID", 90, 400, 400, VaccineLot.ColdChainStatus.OK, VaccineLot.Status.QUARANTINED),   # quarentena
            ("BCG-2403", "BCG", 250, 200, 190, VaccineLot.ColdChainStatus.OK, VaccineLot.Status.ACTIVE),
            ("FLU-2404", "FLU", 200, 600, 550, VaccineLot.ColdChainStatus.WARNING, VaccineLot.Status.ACTIVE),
        ]
        lots: dict[str, VaccineLot] = {}
        for lot_number, vac_code, exp_offset, received, available, cold, status in lot_specs:
            lot, created = VaccineLot.objects.get_or_create(
                tenant=tenant,
                vaccine=vaccines[vac_code],
                lot_number=lot_number,
                defaults={
                    "official_batch_code": f"OFF-{lot_number}",
                    "status": status,
                    "expiration_date": today + timedelta(days=exp_offset),
                    "received_at": today - timedelta(days=30),
                    "doses_received": received,
                    "doses_available": available,
                    "reserved_doses": min(20, available),
                    "storage_location": "Câmara fria central - Prateleira A",
                    "cold_chain_status": cold,
                },
            )
            lots[lot_number] = lot
            self.stdout.write(f"  {'+' if created else '='} lote {lot_number} [{lot.status}]")

        # ── Campanha ativa ───────────────────────────────────────
        campaign, _ = VaccinationCampaign.objects.get_or_create(
            tenant=tenant,
            name="Campanha Nacional de Vacinação contra o Sarampo 2026",
            defaults={
                "vaccine": vaccines["VASPR"],
                "campaign_type": VaccinationCampaign.CampaignType.MASS,
                "status": VaccinationCampaign.Status.ACTIVE,
                "target_region": "Maputo Província",
                "target_age_min_months": 9,
                "target_age_max_months": 60,
                "target_population": 12000,
                "target_doses": 10000,
                "start_date": today - timedelta(days=15),
                "end_date": today + timedelta(days=45),
                "official_program_code": "PNV-SARAMPO-2026",
            },
        )
        self.stdout.write(f"  campanha ativa: {campaign.name}")

        # ── Metas por região ─────────────────────────────────────
        # (região, distrito, idade min/max meses, população, meta doses, aplicadas)
        target_specs = [
            ("Maputo Província", "Matola", 9, 60, 4000, 3500, 3100),
            ("Maputo Província", "Boane", 9, 60, 1500, 1200, 500),
            ("Maputo Província", "Marracuene", 9, 60, 2000, 1800, 1600),
            ("Gaza", "Xai-Xai", 9, 60, 2500, 2000, 900),
            ("Inhambane", "Maxixe", 9, 60, 2000, 1500, 300),
        ]
        for region, district, age_min, age_max, population, target_doses, administered in target_specs:
            target, created = VaccinationCampaignTarget.objects.get_or_create(
                tenant=tenant,
                campaign=campaign,
                region=region,
                district=district,
                age_min_months=age_min,
                age_max_months=age_max,
                defaults={
                    "target_population": population,
                    "target_doses": target_doses,
                    "administered_doses": administered,
                },
            )
            if created:
                self.stdout.write(f"  + meta {region} / {district}")

        # ── Imunizações com reforços vencidos ────────────────────
        booster_lot = lots["HEPB-2401"]
        patients = list(Patient.objects.filter(tenant=tenant).order_by("pk")[:6])
        immun_records: list[ImmunizationRecord] = []
        for idx, patient in enumerate(patients):
            record, created = ImmunizationRecord.objects.get_or_create(
                tenant=tenant,
                patient=patient,
                vaccine=vaccines["HEPB"],
                dose_number=1,
                defaults={
                    "lot": booster_lot,
                    "status": ImmunizationRecord.Status.ADMINISTERED,
                    "source": ImmunizationRecord.Source.ROUTINE,
                    "administered_at": now - timedelta(days=60 + idx),
                    "next_due_date": today - timedelta(days=10 + idx),  # reforço vencido
                    "route": ImmunizationRecord.Route.IM,
                    "body_site": "Deltóide esquerdo",
                },
            )
            immun_records.append(record)
            if created:
                self.stdout.write(f"  + imunização {patient} (reforço vencido)")

        # ── AEFI grave em investigação ───────────────────────────
        if immun_records:
            base_record = immun_records[0]
            aefi, created = AdverseEventFollowingImmunization.objects.get_or_create(
                tenant=tenant,
                immunization_record=base_record,
                patient=base_record.patient,
                vaccine=base_record.vaccine,
                defaults={
                    "lot": base_record.lot,
                    "severity": AdverseEventFollowingImmunization.Severity.SEVERE,
                    "status": AdverseEventFollowingImmunization.Status.UNDER_INVESTIGATION,
                    "onset_at": now - timedelta(days=3, hours=2),
                    "reported_at": now - timedelta(days=3),
                    "symptoms": "Febre alta persistente (39.5°C), edema local extenso e reação alérgica sistémica.",
                    "outcome": AdverseEventFollowingImmunization.Outcome.RECOVERING,
                },
            )
            if created:
                self.stdout.write(f"  + AEFI grave em investigação: {base_record.patient}")
        else:
            aefi = None

        # ── Notificações oficiais pendentes ──────────────────────
        cov_notif, created = PublicHealthNotification.objects.get_or_create(
            tenant=tenant,
            event_type=PublicHealthNotification.EventType.CAMPAIGN_COVERAGE,
            campaign=campaign,
            external_reference="COV-SARAMPO-2026-001",
            defaults={
                "official_system": PublicHealthNotification.OfficialSystem.DHIS2,
                "status": PublicHealthNotification.Status.PENDING,
                "attempt_count": 2,
                "next_retry_at": now + timedelta(hours=1),
                "error_message": "Timeout ao contactar o endpoint DHIS2.",
            },
        )
        if created:
            self.stdout.write("  + notificação de cobertura (pendente)")

        if aefi is not None:
            aefi_notif, created = PublicHealthNotification.objects.get_or_create(
                tenant=tenant,
                event_type=PublicHealthNotification.EventType.AEFI,
                adverse_event=aefi,
                external_reference="AEFI-2026-001",
                defaults={
                    "official_system": PublicHealthNotification.OfficialSystem.E_SUS,
                    "status": PublicHealthNotification.Status.FAILED,
                    "attempt_count": 3,
                    "error_message": "Rejeitado: campo obrigatório em falta no payload e-SUS.",
                },
            )
            if created:
                self.stdout.write("  + notificação AEFI (falhou)")

        self.stdout.write(self.style.SUCCESS("Seed de Saúde Pública concluído."))
