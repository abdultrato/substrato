"""Seed de avaliações de competência (Gestão da Qualidade do laboratório).

Cria ~30 avaliações realistas ligadas a colaboradores, avaliadores e exames
do catálogo existente. Idempotente por (tenant, staff, area).
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.clinical_laboratory.models import CompetencyAssessment, LabTest
from apps.tenants.models import Tenant


COMPETENCY_AREAS = [
    "Colheita de sangue venoso (flebotomia)",
    "Coloração de Gram",
    "Operação do analisador de hematologia Sysmex XN",
    "Operação do GeneXpert (TB/RIF)",
    "Microscopia de baciloscopia (BAAR)",
    "Manuseio de amostras de alto risco (BSL-3)",
    "Preparação de meios de cultura",
    "Contagem diferencial de leucócitos",
    "Determinação de grupo sanguíneo ABO/Rh",
    "Controlo de qualidade interno (Levey-Jennings)",
    "Calibração de pipetas automáticas",
    "Operação do analisador bioquímico Cobas c311",
    "Técnica de ELISA (VIH/Hepatites)",
    "Processamento de amostras de urina (urina II)",
    "Antibiograma por disco-difusão (Kirby-Bauer)",
    "Centrifugação e separação de plasma/soro",
    "Gestão de resíduos biológicos",
    "Validação técnica de resultados críticos",
    "Operação da cabine de segurança biológica",
    "Coloração de Ziehl-Neelsen",
    "Manuseio de nitrogénio líquido / criopreservação",
    "Técnica de PCR em tempo real",
    "Leitura de esfregaço de sangue periférico",
    "Preparação de reagentes e soluções-mãe",
    "Registo e rastreabilidade de amostras (LIS)",
    "Coagulação — TP/TTPa no analisador",
    "Gasometria arterial",
    "Identificação bacteriana por VITEK 2",
    "Testes rápidos de malária (TDR)",
    "Descontaminação de superfícies e derrames",
]

STATUSES = [
    ("COMPETENTE", 0.45),
    ("AVALIADA", 0.15),
    ("AGENDADA", 0.12),
    ("NECESSITA_FORMACAO", 0.12),
    ("RESTRINGIDA", 0.08),
    ("EXPIRADA", 0.08),
]


def weighted_status(rng):
    r = rng.random()
    acc = 0.0
    for status, w in STATUSES:
        acc += w
        if r <= acc:
            return status
    return STATUSES[0][0]


class Command(BaseCommand):
    help = "Cria ~30 avaliações de competência de demonstração."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=30)
        parser.add_argument("--tenant", type=int, default=None,
                            help="ID do tenant (default: primeiro tenant ativo).")

    def handle(self, *args, **opts):
        rng = random.Random(20260706)
        count = opts["count"]

        tenant = (
            Tenant.objects.filter(id=opts["tenant"]).first()
            if opts["tenant"]
            else Tenant.objects.filter(active=True).first()
        )
        if not tenant:
            self.stderr.write(self.style.ERROR("Nenhum tenant ativo encontrado."))
            return

        from django.contrib.auth import get_user_model
        User = get_user_model()

        staff_pool = list(
            User.objects.filter(tenant=tenant, is_active=True)
            .exclude(first_name="")
            .order_by("id")[:60]
        )
        if len(staff_pool) < 4:
            staff_pool = list(User.objects.filter(is_active=True).order_by("id")[:60])
        if len(staff_pool) < 2:
            self.stderr.write(self.style.ERROR("Colaboradores insuficientes."))
            return

        test_pool = list(LabTest.objects.filter(tenant=tenant).order_by("id")[:400])
        if not test_pool:
            test_pool = list(LabTest.objects.order_by("id")[:400])

        today = timezone.localdate()
        areas = COMPETENCY_AREAS[:]
        rng.shuffle(areas)

        created = 0
        for i in range(count):
            area = areas[i % len(areas)]
            staff = rng.choice(staff_pool)
            assessor_choices = [u for u in staff_pool if u.id != staff.id]
            assessed_by = rng.choice(assessor_choices) if assessor_choices else None
            status = weighted_status(rng)

            # datas coerentes com o estado
            if status == "AGENDADA":
                assessment_date = today + timedelta(days=rng.randint(3, 45))
                expiry_date = None
            else:
                assessment_date = today - timedelta(days=rng.randint(15, 400))
                # validade tipicamente 1-2 anos após avaliação
                expiry_date = assessment_date + timedelta(days=rng.choice([365, 548, 730]))
                if status == "EXPIRADA":
                    # força validade no passado
                    expiry_date = today - timedelta(days=rng.randint(5, 120))

            related_test = rng.choice(test_pool) if (test_pool and rng.random() < 0.55) else None

            notes_map = {
                "COMPETENTE": "Colaborador demonstrou domínio pleno do procedimento. Sem restrições.",
                "AVALIADA": "Avaliação concluída; aguarda revisão do responsável técnico.",
                "AGENDADA": "Avaliação planeada. Material e checklist preparados.",
                "NECESSITA_FORMACAO": "Identificadas lacunas na execução. Encaminhado para formação dirigida.",
                "RESTRINGIDA": "Autorizado a executar apenas sob supervisão directa.",
                "EXPIRADA": "Competência fora da validade. Reavaliação necessária.",
            }

            obj, was_created = CompetencyAssessment.objects.get_or_create(
                tenant=tenant,
                staff=staff,
                area=area,
                defaults={
                    "assessed_by": assessed_by,
                    "related_test": related_test,
                    "assessment_date": assessment_date,
                    "expiry_date": expiry_date,
                    "status": status,
                    "notes": notes_map.get(status, ""),
                },
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Competências criadas: {created} (tenant {tenant.id} — {tenant.name})."
        ))
