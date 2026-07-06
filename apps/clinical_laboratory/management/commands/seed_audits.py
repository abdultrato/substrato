"""Seed de auditorias internas (Gestão da Qualidade do laboratório).

Cria ~30 auditorias realistas com auditor, âmbito, critérios e, para as que
já decorreram, alguns achados. Idempotente por (tenant, code).
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.clinical_laboratory.models import AuditFinding, InternalAudit
from apps.tenants.models import Tenant


AREAS = [
    "Fase pré-analítica — colheita e transporte",
    "Fase analítica — hematologia",
    "Fase analítica — bioquímica clínica",
    "Fase analítica — microbiologia",
    "Fase pós-analítica — validação e laudos",
    "Gestão documental e controlo de registos",
    "Controlo de qualidade interno e externo",
    "Gestão de equipamentos e calibração",
    "Biossegurança e gestão de resíduos",
    "Gestão de reagentes e stocks",
    "Competência e formação do pessoal",
    "Rastreabilidade de amostras (LIS)",
    "Gestão de não conformidades e CAPA",
    "Comunicação de resultados críticos",
    "Banco de sangue — imunohematologia",
    "Anatomia patológica",
    "Gestão de fornecedores e compras",
    "Ambiente e infraestrutura do laboratório",
    "Sistema de informação e cibersegurança",
    "Revisão pela gestão e melhoria contínua",
]

CRITERIA = [
    "ISO 15189:2022 — Requisitos de qualidade e competência.",
    "ISO 15189:2022 cláusulas 5.5 (processos analíticos) e 5.8 (laudos).",
    "Manual da qualidade do laboratório, edição vigente.",
    "ISO 15190 — Segurança em laboratórios médicos.",
    "Procedimentos operacionais padrão (SOP) do sector.",
]

SCOPES = [
    "Auditoria a todo o fluxo do sector, incluindo registos dos últimos 6 meses.",
    "Avaliação de procedimentos, registos e evidências de conformidade.",
    "Verificação da implementação de ações corretivas anteriores.",
    "Amostragem de casos e entrevistas aos colaboradores do sector.",
    "Revisão documental e observação direta das práticas de trabalho.",
]

CONCLUSIONS = {
    "clean": "Sector globalmente conforme. Boas práticas evidenciadas; sem NCs maiores.",
    "minor": "Conformidade geral com pontos de melhoria identificados. Emitidas NCs menores.",
    "major": "Identificadas não conformidades maiores que requerem ação corretiva imediata.",
    "": "",
}

FINDING_POOL = [
    ("CONFORMIDADE", "", "Registos completos e rastreáveis; práticas conformes ao SOP."),
    ("OBSERVACAO", "5.3", "Etiquetagem de reagentes poderia ser mais visível."),
    ("MELHORIA", "4.14", "Oportunidade de automatizar o registo de temperaturas."),
    ("NC_MENOR", "5.5.1", "Um SOP sem revisão dentro do prazo definido."),
    ("NC_MENOR", "5.8.2", "Dois laudos sem dupla verificação documentada."),
    ("NC_MAIOR", "5.6.2", "Ausência de registos de controlo de qualidade em 3 dias."),
    ("NC_MAIOR", "5.3.1", "Equipamento crítico sem evidência de calibração válida."),
    ("OBSERVACAO", "5.4", "Fluxo de amostras urgentes poderia ser sinalizado."),
]

STATUS_WEIGHTS = [
    ("FECHADA", 0.25),
    ("CONCLUIDA", 0.20),
    ("ACHADOS_ABERTOS", 0.18),
    ("EM_CURSO", 0.15),
    ("AGENDADA", 0.12),
    ("PLANEADA", 0.10),
]

# estados em que já existem achados
HAS_FINDINGS = {"CONCLUIDA", "ACHADOS_ABERTOS", "FECHADA"}


def weighted(rng):
    r = rng.random()
    acc = 0.0
    for s, w in STATUS_WEIGHTS:
        acc += w
        if r <= acc:
            return s
    return STATUS_WEIGHTS[0][0]


class Command(BaseCommand):
    help = "Cria ~30 auditorias internas de demonstração (com achados)."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=30)
        parser.add_argument("--tenant", type=int, default=None)

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
        auditors = list(
            User.objects.filter(tenant=tenant, is_active=True)
            .exclude(first_name="").order_by("id")[:40]
        )
        if not auditors:
            auditors = list(User.objects.filter(is_active=True).order_by("id")[:40])

        from apps.clinical_laboratory.models import LabSector
        sector_pool = list(LabSector.objects.filter(tenant=tenant, active=True).order_by("id"))
        if not sector_pool:
            sector_pool = list(LabSector.objects.filter(tenant=tenant).order_by("id"))

        today = timezone.localdate()
        areas = AREAS[:]
        rng.shuffle(areas)

        created = 0
        findings_created = 0
        for i in range(count):
            area = areas[i % len(areas)]
            status = weighted(rng)
            auditor = rng.choice(auditors) if auditors else None
            code = f"AUD-2026-{i + 1:03d}"

            if status in ("PLANEADA", "AGENDADA"):
                audit_date = today + timedelta(days=rng.randint(5, 60))
                conclusion = ""
            else:
                audit_date = today - timedelta(days=rng.randint(5, 300))
                if status == "FECHADA":
                    conclusion = CONCLUSIONS[rng.choice(["clean", "minor"])]
                elif status == "ACHADOS_ABERTOS":
                    conclusion = CONCLUSIONS["major"]
                else:
                    conclusion = CONCLUSIONS[rng.choice(["clean", "minor", ""])]

            obj, was_created = InternalAudit.objects.get_or_create(
                tenant=tenant,
                code=code,
                defaults={
                    "area": area,
                    "auditor": auditor,
                    "audit_date": audit_date,
                    "scope": rng.choice(SCOPES),
                    "criteria": rng.choice(CRITERIA),
                    "conclusion": conclusion,
                    "status": status,
                },
            )
            # sectores auditados (M2M) — 1 a 3 por auditoria; area deriva daqui
            if sector_pool and not obj.sectors.exists():
                n = rng.randint(1, min(3, len(sector_pool)))
                obj.sectors.set(rng.sample(sector_pool, n))
                obj.sync_area_from_sectors()

            if was_created:
                created += 1

                # achados para auditorias já decorridas
                if status in HAS_FINDINGS:
                    n = rng.randint(1, 4)
                    picks = rng.sample(FINDING_POOL, min(n, len(FINDING_POOL)))
                    for ftype, clause, desc in picks:
                        AuditFinding.objects.create(
                            tenant=tenant,
                            audit=obj,
                            finding_type=ftype,
                            clause=clause,
                            description=desc,
                        )
                        findings_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Auditorias criadas: {created} (+{findings_created} achados) "
            f"— tenant {tenant.id} ({tenant.name})."
        ))
