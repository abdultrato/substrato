"""Seed de Recursos Humanos: profissões, cargos e funcionários por sector.

Cria um quadro de pessoal coerente com os sectores do sistema (recepção, RH,
medicina, medicina ocupacional, enfermagem, laboratório, saúde pública,
farmácia, imagiologia, biossegurança, administração, finanças e serviços de
apoio), começando por recepcionistas, gestor de RH, médicos, técnico de
laboratório e enfermeiro.

Idempotente: reexecutar não duplica (get_or_create por nome/tenant).

    python manage.py seed_hr_staff
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.human_resources.models import Employee, JobTitle, Profession

# (chave, nome da profissão, categoria, salário base MZN, requer licença, entidade, é médico, nível hierárquico)
PROFESSIONS = [
    ("recepcionista",      "Recepcionista",                 "Atendimento e Recepção",      Decimal("18000"),  False, "",                                  False, None),
    ("gestor_rh",          "Gestor de Recursos Humanos",    "Gestão / Recursos Humanos",   Decimal("65000"),  False, "",                                  False, 2),
    ("tecnico_rh",         "Técnico de Recursos Humanos",   "Recursos Humanos",            Decimal("32000"),  False, "",                                  False, None),
    ("medico_geral",       "Médico Clínico Geral",          "Medicina",                    Decimal("120000"), True,  "Ordem dos Médicos de Moçambique",   True,  None),
    ("medico_especialista","Médico Especialista",           "Medicina",                    Decimal("160000"), True,  "Ordem dos Médicos de Moçambique",   True,  None),
    ("medico_trabalho",    "Médico do Trabalho",            "Medicina Ocupacional",        Decimal("140000"), True,  "Ordem dos Médicos de Moçambique",   True,  None),
    ("enfermeiro",         "Enfermeiro(a)",                 "Enfermagem",                  Decimal("45000"),  True,  "Ordem dos Enfermeiros de Moçambique", False, None),
    ("enfermeiro_chefe",   "Enfermeiro(a) Chefe",           "Enfermagem",                  Decimal("60000"),  True,  "Ordem dos Enfermeiros de Moçambique", False, 3),
    ("tecnico_lab",        "Técnico de Laboratório",        "Laboratório Clínico",         Decimal("38000"),  True,  "MISAU",                             False, None),
    ("patologista",        "Patologista Clínico",           "Laboratório Clínico",         Decimal("150000"), True,  "Ordem dos Médicos de Moçambique",   True,  None),
    ("tecnico_sp",         "Técnico de Saúde Pública",      "Saúde Pública",               Decimal("42000"),  False, "",                                  False, None),
    ("epidemiologista",    "Epidemiologista",               "Saúde Pública",               Decimal("130000"), True,  "MISAU",                             False, None),
    ("farmaceutico",       "Farmacêutico(a)",               "Farmácia",                    Decimal("90000"),  True,  "Ordem dos Farmacêuticos",           False, None),
    ("tecnico_farmacia",   "Técnico de Farmácia",           "Farmácia",                    Decimal("35000"),  True,  "MISAU",                             False, None),
    ("tecnico_radiologia", "Técnico de Radiologia",         "Imagiologia",                 Decimal("40000"),  True,  "MISAU",                             False, None),
    ("tecnico_biosseg",    "Técnico de Biossegurança",      "Biossegurança",               Decimal("40000"),  False, "",                                  False, None),
    ("contabilista",       "Contabilista",                  "Financeiro e Contabilidade",  Decimal("55000"),  False, "",                                  False, None),
    ("director_clinico",   "Director Clínico",              "Administração",               Decimal("180000"), True,  "Ordem dos Médicos de Moçambique",   True,  1),
    ("auxiliar_higiene",   "Auxiliar de Higiene Hospitalar","Serviços Gerais",             Decimal("14000"),  False, "",                                  False, None),
    ("motorista",          "Motorista de Ambulância",       "Transporte",                  Decimal("20000"),  True,  "INATTER (carta de condução)",       False, None),
    ("seguranca",          "Agente de Segurança",           "Segurança",                   Decimal("16000"),  False, "",                                  False, None),
    ("tecnico_ti",         "Técnico de Informática",        "Tecnologias de Informação",   Decimal("48000"),  False, "",                                  False, None),
    ("nutricionista",      "Nutricionista",                 "Nutrição",                    Decimal("60000"),  True,  "MISAU",                             False, None),
    ("fisioterapeuta",     "Fisioterapeuta",                "Reabilitação",                Decimal("58000"),  True,  "MISAU",                             False, None),
    ("psicologo",          "Psicólogo Clínico",             "Psicologia",                  Decimal("70000"),  True,  "Ordem dos Psicólogos",              False, None),
]

# (nome, género, chave da profissão, ano de admissão)
EMPLOYEES = [
    ("Ana Cumbe Sitoe",           "F", "recepcionista",       2022),
    ("Benilde Mahumane",          "F", "recepcionista",       2023),
    ("Osvaldo Machava Cossa",     "M", "gestor_rh",           2019),
    ("Lúcia Nhaca Tembe",         "F", "tecnico_rh",          2021),
    ("Fernando Mondlane Bila",    "M", "medico_geral",        2018),
    ("Isabel Chissano Muendane",  "F", "medico_geral",        2020),
    ("Alberto Guebuza Nhampossa", "M", "medico_especialista", 2016),
    ("Carla Mabjaia Langa",       "F", "medico_trabalho",     2019),
    ("Joana Tembe Macuácua",      "F", "enfermeiro",          2021),
    ("Paulo Macuácua Sumbane",    "M", "enfermeiro",          2022),
    ("Rosa Chirindza Massingue",  "F", "enfermeiro_chefe",    2015),
    ("Silvério Nhampossa Cuna",   "M", "tecnico_lab",         2020),
    ("Amélia Cossa Chambal",      "F", "tecnico_lab",         2023),
    ("Manuel Langa Mucavele",     "M", "patologista",         2014),
    ("Hélder Muianga Zandamela",  "M", "tecnico_sp",          2021),
    ("Teresa Sitole Nhabinde",    "F", "epidemiologista",     2017),
    ("Cláudio Matsinhe Bila",     "M", "farmaceutico",        2018),
    ("Ivone Chambal Cuna",        "F", "tecnico_farmacia",    2022),
    ("Gerson Bila Massango",      "M", "tecnico_radiologia",  2020),
    ("Nelson Zandamela Cossa",    "M", "tecnico_biosseg",     2021),
    ("Márcia Nhantumbo Sitoe",    "F", "contabilista",        2019),
    ("Jorge Mucavele Guebuza",    "M", "director_clinico",    2012),
    ("Felisberta Cuna Mahumane",  "F", "auxiliar_higiene",    2022),
    ("António Chaúque Bila",      "M", "motorista",           2021),
    ("Bernardo Sumbane Macuácua", "M", "seguranca",           2020),
    ("Edson Mabunda Nhaca",       "M", "tecnico_ti",          2021),
    ("Sandra Nhaca Chirindza",    "F", "nutricionista",       2022),
    ("Dércio Massingue Tembe",    "M", "fisioterapeuta",      2020),
    ("Vanessa Nhabinde Cumbe",    "F", "psicologo",           2019),
]


def _slug_email(name: str) -> str:
    import unicodedata

    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    parts = [p for p in normalized.lower().split() if p]
    if len(parts) >= 2:
        return f"{parts[0]}.{parts[-1]}@clinica.co.mz"
    return f"{parts[0]}@clinica.co.mz" if parts else "funcionario@clinica.co.mz"


class Command(BaseCommand):
    help = "Popula profissões, cargos e funcionários por sector (idempotente)."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", type=int, default=None, help="ID do tenant (por omissão usa o primeiro).")

    @transaction.atomic
    def handle(self, *args, **options):
        tenant_model = Employee._meta.get_field("tenant").related_model
        if options["tenant"]:
            tenant = tenant_model.objects.filter(pk=options["tenant"]).first()
        else:
            tenant = tenant_model.objects.order_by("pk").first()
        if not tenant:
            raise CommandError("Nenhum tenant encontrado. Crie um tenant antes de correr o seed.")

        self.stdout.write(f"Tenant: {tenant} (#{tenant.pk})")

        # ── Profissões + Cargos ──────────────────────────────────
        professions: dict[str, Profession] = {}
        job_titles: dict[str, JobTitle] = {}
        for key, name, category, salary, requires_license, authority, is_doctor, level in PROFESSIONS:
            profession, p_created = Profession.objects.get_or_create(
                tenant=tenant,
                name=name,
                defaults={
                    "professional_category": category,
                    "base_salary": salary,
                    "requires_license": requires_license,
                    "license_authority": authority,
                    "active": True,
                    "description": f"Profissão do sector: {category}.",
                },
            )
            professions[key] = profession

            job_title, j_created = JobTitle.objects.get_or_create(
                tenant=tenant,
                name=name,
                defaults={
                    "description": f"Cargo de {name} ({category}).",
                    "is_doctor": is_doctor,
                    "hierarchy_level": level,
                    "status": JobTitle.Status.ACTIVE,
                },
            )
            job_titles[key] = job_title
            flag = "+" if (p_created or j_created) else "="
            self.stdout.write(f"  {flag} profissao/cargo {name}")

        # ── Funcionários ─────────────────────────────────────────
        created_count = 0
        for full_name, gender, prof_key, year in EMPLOYEES:
            profession = professions[prof_key]
            job_title = job_titles[prof_key]
            employee, created = Employee.objects.get_or_create(
                tenant=tenant,
                name=full_name,
                defaults={
                    "role": job_title,
                    "profession": profession,
                    "gender": Employee.Gender.MALE if gender == "M" else Employee.Gender.FEMALE,
                    "nationality": "Moçambicana",
                    "status": Employee.Status.ACTIVE,
                    "admission_date": date(year, 3, 1),
                    "email": _slug_email(full_name),
                    "phone": "+258 84 000 0000",
                    "document_type": Employee.DocumentType.BI,
                    "payment_method": Employee.PaymentMethod.BANK,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"  + {full_name} — {profession.name}")
            else:
                self.stdout.write(f"  = {full_name}")

        self.stdout.write(self.style.SUCCESS(
            f"Seed de RH concluído: {len(professions)} profissões, {len(job_titles)} cargos, "
            f"{created_count} novos funcionários (de {len(EMPLOYEES)})."
        ))
