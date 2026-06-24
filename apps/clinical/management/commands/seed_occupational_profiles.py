"""Semeia perfis ocupacionais de medicina do trabalho por tenant.

Cria 5 perfis para trabalhos de risco, associando os exames laboratoriais
disponíveis no catálogo de cada tenant. Idempotente (get_or_create por nome).

Uso:
    python manage.py seed_occupational_profiles
    python manage.py seed_occupational_profiles --tenant local
"""

from django.core.management.base import BaseCommand

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.occupational_profile import OccupationalExamProfile
from apps.tenants.models.tenant import Tenant

# ---------------------------------------------------------------------------
# Catálogo de perfis
# Cada entrada: (nome, profissão, descrição, [substrings de nome de exame])
# Os exames são resolvidos por correspondência parcial no nome (case-insensitive)
# para ser resiliente a variações de nomenclatura entre tenants.
# ---------------------------------------------------------------------------

PROFILES = [
    (
        "Perfil Ocupacional — Mineiro / Trabalho Subterrâneo",
        "Mineiro / operador em minas",
        (
            "Exames de rastreio para trabalhadores expostos a poeiras minerais, "
            "sílica, metais pesados e ambientes confinados com risco de hipóxia."
        ),
        [
            "hemograma",
            "glicemia",
            "creatinina",
            "ureia",
            "proteina c reativa",
            "tgp", "alt",
            "tgo", "ast",
            "urina",
        ],
    ),
    (
        "Perfil Ocupacional — Soldador / Exposição a Fumos Metálicos",
        "Soldador / serralheiro",
        (
            "Rastreio de toxicidade por fumos metálicos, manganês e solventes "
            "em trabalhadores de soldadura e corte a quente."
        ),
        [
            "hemograma",
            "tgp", "alt",
            "tgo", "ast",
            "fosfatase alcalina",
            "bilirrubina",
            "creatinina",
            "ureia",
            "urina",
            "proteina c reativa",
        ],
    ),
    (
        "Perfil Ocupacional — Agricultor / Exposição a Pesticidas",
        "Agricultor / trabalhador rural",
        (
            "Avaliação periódica para trabalhadores agrícolas expostos a "
            "organofosforados, herbicidas e fungicidas."
        ),
        [
            "hemograma",
            "glicemia",
            "tgp", "alt",
            "tgo", "ast",
            "colesterol",
            "triglicerideo",
            "urina",
            "creatinina",
            "malaria",
        ],
    ),
    (
        "Perfil Ocupacional — Trabalhador de Construção Civil",
        "Construção civil / obra",
        (
            "Rastreio para trabalhadores em estaleiros com exposição a poeiras, "
            "ruído, vibração e risco de acidentes físicos."
        ),
        [
            "hemograma",
            "glicemia",
            "colesterol",
            "triglicerideo",
            "creatinina",
            "urina",
            "proteina c reativa",
        ],
    ),
    (
        "Perfil Ocupacional — Segurança / Vigilância Noturna",
        "Segurança / vigilante",
        (
            "Avaliação periódica para trabalhadores de segurança sujeitos a "
            "turnos nocturnos, stress e risco cardiovascular elevado."
        ),
        [
            "hemograma",
            "glicemia",
            "colesterol",
            "triglicerideo",
            "hdl",
            "ldl",
            "tsh",
            "urina",
            "proteina c reativa",
        ],
    ),
]


def _match_exams(tenant, name_fragments: list[str]) -> list[LabExam]:
    """Devolve os exames do tenant cujo nome contenha algum dos fragmentos."""
    from django.db.models import Q
    q = Q()
    for fragment in name_fragments:
        q |= Q(name__icontains=fragment)
    return list(LabExam.objects.filter(tenant=tenant).filter(q))


class Command(BaseCommand):
    help = "Cria perfis ocupacionais de medicina do trabalho para um ou todos os tenants."

    def add_arguments(self, parser):
        parser.add_argument(
            "--tenant",
            help="id ou identifier do tenant (omitir = todos os ativos)",
        )

    def handle(self, *args, **options):
        tenant_ref = options.get("tenant")
        if tenant_ref:
            tenant = (
                Tenant.all_objects.filter(identifier=tenant_ref).first()
                or (
                    Tenant.all_objects.filter(pk=tenant_ref).first()
                    if str(tenant_ref).isdigit()
                    else None
                )
            )
            if tenant is None:
                self.stderr.write(self.style.ERROR(f"Tenant não encontrado: {tenant_ref}"))
                return
            tenants = [tenant]
        else:
            tenants = list(Tenant.objects.all())

        if not tenants:
            self.stdout.write(self.style.WARNING("Nenhum tenant encontrado."))
            return

        for tenant in tenants:
            created_count = 0
            updated_count = 0

            for name, profession, description, fragments in PROFILES:
                profile, was_created = OccupationalExamProfile.objects.get_or_create(
                    tenant=tenant,
                    name=name,
                    defaults={
                        "profession": profession,
                        "description": description,
                        "active": True,
                    },
                )

                exams = _match_exams(tenant, fragments)
                if exams:
                    profile.exams.set(exams)

                if was_created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  [{tenant.identifier}] Criado: {name} "
                            f"({len(exams)} exames associados)"
                        )
                    )
                else:
                    updated_count += 1
                    self.stdout.write(
                        f"  [{tenant.identifier}] Já existe: {name} "
                        f"({len(exams)} exames)"
                    )

            self.stdout.write(
                self.style.SUCCESS(
                    f"[{tenant.identifier}] Perfis ocupacionais: "
                    f"+{created_count} criados, {updated_count} já existiam."
                )
            )
