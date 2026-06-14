"""Seed de pacientes hipotéticos (realistas) para desenvolvimento/QA/demonstração.

Gera N pacientes com TODOS os campos preenchidos no esquema real do Substrato
(modelo ``apps.clinical.Patient``), respeitando tenant, geração de ``custom_id``,
unicidade de documento/email e o resumo automático de morada.

Uso:
    python manage.py seed_patients                # 100 pacientes no 1º tenant
    python manage.py seed_patients --count 250
    python manage.py seed_patients --tenant 1
    python manage.py seed_patients --clear        # remove os pacientes deste seed antes
"""

from __future__ import annotations

import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.clinical.models.patient import BloodType, Patient
from apps.tenants.models import Tenant
from core.constants.document_types import DocumentType
from core.constants.gender import Gender
from core.constants.provenance import Provenance
from core.constants.race_origin import RaceOrigin

# Marcador para identificar (e poder limpar) os pacientes criados por este seed.
SEED_TAG = "SEED"

FIRST_NAMES_M = [
    "Carlos", "Tomás", "Paulo", "Adriano", "Daniel", "Fernando", "Nasser", "Zacarias",
    "Samuel", "Manuel", "Bento", "Rui", "Osvaldo", "Ricardo", "Wilson", "Geraldo",
    "Eusébio", "Aníbal", "Edson", "Hélder", "Mateus", "Félix", "Abdul", "Isaías",
    "Valdemiro", "Armando", "Hilário", "Élisio", "Nélio", "Ibrahim",
]
FIRST_NAMES_F = [
    "Cláudia", "Nádia", "Helena", "Rosa", "Vânia", "Sílvia", "Jacinta", "Isabel",
    "Júlia", "Ana", "Ângela", "Catarina", "Matilde", "Celeste", "Teresa", "Filomena",
    "Fátima", "Lúcia", "Marta", "Beatriz", "Emília", "Aida", "Rita", "Carla",
    "Verónica", "Yolanda", "Dulce", "Zenaida", "Joana", "Graça",
]
MIDDLE_NAMES = [
    "Joaquim", "Esperança", "Nuro", "Muthemba", "Matsinhe", "Machel", "Catarina",
    "Mavie", "Langa", "Trato", "Mendes", "Cossa", "Magaia", "Chivambo", "Fernandes",
    "Isaías", "Armando", "Miguel", "Rafael", "Madalena", "Teresa", "Aurora",
]
SURNAMES = [
    "Macamo", "Chivambo", "Matsinhe", "Anli", "Massango", "Mussa", "Tembe", "Mabunda",
    "Muendane", "Macuácua", "Mondlane", "Nhantumbo", "Gonçalves", "Sitoe", "Mucavel",
    "Malate", "Issufo", "Nhampossa", "Chale", "Cossa", "Machava", "Matavele", "Nuro",
    "Chissano", "Nhamirre", "Nhamitambo", "Mucave", "Chongo", "Saíde", "Langa",
]

# Província -> (cidades, código postal base)
PROVINCES = {
    "Maputo Cidade": (["Maputo"], "1100"),
    "Maputo Província": (["Matola", "Boane", "Marracuene", "Namaacha"], "1200"),
    "Gaza": (["Xai-Xai", "Chókwè", "Manjacaze"], "1300"),
    "Inhambane": (["Inhambane", "Maxixe", "Vilankulo", "Massinga"], "1400"),
    "Sofala": (["Beira", "Dondo", "Nhamatanda", "Gorongosa"], "2100"),
    "Manica": (["Chimoio", "Gondola", "Manica"], "2200"),
    "Tete": (["Tete", "Moatize", "Changara", "Cahora Bassa"], "2300"),
    "Zambézia": (["Quelimane", "Mocuba", "Milange", "Gurué"], "3100"),
    "Nampula": (["Nampula", "Nacala", "Angoche", "Murrupula"], "4100"),
    "Cabo Delgado": (["Pemba", "Montepuez", "Ancuabe", "Chiúre"], "5100"),
    "Niassa": (["Lichinga", "Cuamba", "Marrupa"], "5200"),
}
NEIGHBORHOODS = [
    "Munhava", "Natikiri", "Mavalane", "Malhangalene", "Alto Maé", "Central", "Liberdade",
    "Esturro", "Macuti", "Chota", "Muhala", "Napipine", "Paquitequete", "Natite",
    "Fomento", "Machava", "Coalane", "Icídua", "Manhaua", "Samora Machel",
]
STREETS = [
    "Av. Julius Nyerere", "Av. 25 de Setembro", "Av. Eduardo Mondlane", "Rua da Unidade",
    "Rua do Mercado", "Rua da Escola", "Av. Marginal", "Av. Vladimir Lenine",
    "Rua dos Trabalhadores", "Av. da Independência",
]
COMPLEMENTS = [
    "Perto da escola primária", "Junto à paragem principal", "Atrás do centro de saúde",
    "Próximo à esquadra", "Próximo ao mercado local", "Ao lado da farmácia",
]
COMPANION_REL = [
    "Cônjuge", "Pai", "Mãe", "Irmão(ã)", "Filho(a)", "Tio(a)", "Primo(a)", "Responsável legal",
]
INAPT_REASONS = [
    "Hemoglobina abaixo do limite mínimo na triagem.",
    "Tensão arterial elevada no momento da doação.",
    "Doação recente dentro do intervalo mínimo.",
    "Sintomas gripais reportados na triagem.",
]
BLOOD_TYPES = [
    BloodType.O_NEGATIVE, BloodType.O_POSITIVE, BloodType.A_NEGATIVE, BloodType.A_POSITIVE,
    BloodType.B_NEGATIVE, BloodType.B_POSITIVE, BloodType.AB_NEGATIVE, BloodType.AB_POSITIVE,
]
DOC_PREFIX = {
    DocumentType.BI: "BI", DocumentType.PASSAPORTE: "PA", DocumentType.DIRE: "DR",
    DocumentType.CARTA_CONDUCAO: "CC", DocumentType.NUIT: "NU", DocumentType.CARTAO_ELEITOR: "CE",
    DocumentType.CERTIDAO_NASCIMENTO: "CN", DocumentType.OUTRO: "OU",
}


def _ascii_slug(value: str) -> str:
    import unicodedata

    normalized = unicodedata.normalize("NFKD", value)
    return "".join(c for c in normalized if not unicodedata.combining(c)).lower()


class Command(BaseCommand):
    help = "Cria pacientes hipotéticos realistas com todos os campos preenchidos."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=100, help="Quantidade de pacientes (default: 100).")
        parser.add_argument("--tenant", type=int, default=None, help="ID do tenant (default: o primeiro).")
        parser.add_argument("--seed", type=int, default=42, help="Semente do gerador (reprodutível).")
        parser.add_argument("--clear", action="store_true", help="Remove os pacientes deste seed antes de criar.")

    def handle(self, *args, **options):
        count = options["count"]
        rng = random.Random(options["seed"])

        tenant = (
            Tenant.objects.filter(pk=options["tenant"]).first()
            if options["tenant"]
            else Tenant.objects.order_by("pk").first()
        )
        if not tenant:
            raise CommandError("Nenhum tenant encontrado. Crie um tenant antes de correr o seed.")

        if options["clear"]:
            qs = Patient.all_objects.filter(tenant=tenant, document_number__startswith=f"{SEED_TAG}-")
            removed = qs.count()
            qs.delete()
            self.stdout.write(self.style.WARNING(f"Removidos {removed} pacientes do seed anterior."))

        today = timezone.localdate()
        created = 0
        skipped = 0

        with transaction.atomic():
            for i in range(1, count + 1):
                document_number = f"{SEED_TAG}-{i:05d}"
                if Patient.all_objects.filter(document_number=document_number).exists():
                    skipped += 1
                    continue

                gender = rng.choice([Gender.MALE, Gender.FEMALE])
                first = rng.choice(FIRST_NAMES_M if gender == Gender.MALE else FIRST_NAMES_F)
                name = f"{first} {rng.choice(MIDDLE_NAMES)} {rng.choice(SURNAMES)} {rng.choice(SURNAMES)}"

                age_years = rng.randint(0, 90)
                birth_date = today - timedelta(days=age_years * 365 + rng.randint(0, 364))

                is_female_fertile = gender == Gender.FEMALE and 15 <= age_years <= 45
                pregnant = is_female_fertile and rng.random() < 0.15
                gestational_age_weeks = rng.randint(4, 40) if pregnant else None

                province = rng.choice(list(PROVINCES.keys()))
                cities, postal_base = PROVINCES[province]
                city = rng.choice(cities)

                document_type = rng.choices(
                    [DocumentType.BI, DocumentType.PASSAPORTE, DocumentType.DIRE,
                     DocumentType.NUIT, DocumentType.CARTAO_ELEITOR, DocumentType.CERTIDAO_NASCIMENTO],
                    weights=[60, 8, 6, 10, 8, 8],
                )[0]

                inapt = rng.random() < 0.1
                slug = _ascii_slug(first)

                patient = Patient(
                    tenant=tenant,
                    name=name,
                    gender=gender,
                    birth_date=birth_date,
                    pregnant=pregnant,
                    gestational_age_weeks=gestational_age_weeks,
                    blood_type=rng.choice(BLOOD_TYPES),
                    race_origin=rng.choice([
                        RaceOrigin.BLACK, RaceOrigin.WHITE, RaceOrigin.BROWN,
                        RaceOrigin.YELLOW, RaceOrigin.INDIGENOUS, RaceOrigin.OTHER,
                    ]),
                    document_type=document_type,
                    document_number=document_number,
                    address_street=rng.choice(STREETS),
                    address_number=str(rng.randint(1, 999)),
                    address_neighborhood=rng.choice(NEIGHBORHOODS),
                    address_city=city,
                    address_province=province,
                    address_postal_code=postal_base,
                    address_country="MZ",
                    address_complement=rng.choice(COMPLEMENTS),
                    contact=f"+2588{rng.randint(2, 7)}{rng.randint(1000000, 9999999)}",
                    email=f"{slug}.{document_number.lower()}@exemplo.local",
                    companion_name=f"{rng.choice(FIRST_NAMES_M + FIRST_NAMES_F)} {rng.choice(SURNAMES)}",
                    companion_relationship=rng.choice(COMPANION_REL),
                    companion_contact=f"+2588{rng.randint(2, 7)}{rng.randint(1000000, 9999999)}",
                    companion_email=f"acomp.{document_number.lower()}@exemplo.local",
                    provenance=rng.choice([
                        Provenance.AMBULATORIO, Provenance.CLINICA_EXTERNA, Provenance.CONSULTA_EXTERNA,
                        Provenance.MATERNIDADE, Provenance.PEDIATRIA, Provenance.BANCO_SOCORROS,
                        Provenance.CIRURGIA, Provenance.DENTARIA, Provenance.OFTALMOLOGIA,
                    ]),
                    is_replacement_donor_inapt=inapt,
                    replacement_donor_inapt_at=timezone.now() if inapt else None,
                    replacement_donor_inapt_reason=rng.choice(INAPT_REASONS) if inapt else "",
                )
                patient.save()
                created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seed concluído: {created} pacientes criados, {skipped} já existentes (ignorados). "
            f"Tenant: {tenant.pk} ({getattr(tenant, 'name', '')})."
        ))
