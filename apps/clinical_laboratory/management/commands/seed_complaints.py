"""Seed de reclamações (Gestão da Qualidade do laboratório).

Cria ~30 reclamações realistas de pacientes, médicos e sectores internos.
Idempotente por (tenant, code).
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.clinical_laboratory.models import CustomerComplaint
from apps.tenants.models import Tenant


SOURCES = ["Paciente", "Médico", "Sector interno", "Enfermagem", "Recepção", "Entidade externa"]

COMPLAINTS = [
    "Resultado de exame demorou mais de 5 dias a ser entregue.",
    "Nome do paciente trocado no relatório de hemograma.",
    "Atendimento na sala de colheitas foi demorado e desorganizado.",
    "Amostra de urina foi rejeitada sem justificação clara.",
    "Valores de referência do relatório estavam desatualizados.",
    "Flebotomista fez múltiplas tentativas de punção, causando hematoma.",
    "Resultado de cultura não incluía o antibiograma solicitado.",
    "Portal do paciente não mostrava os resultados já validados.",
    "Recibo emitido com valor divergente do informado na recepção.",
    "Falta de privacidade durante a colheita de amostra.",
    "Relatório de biópsia entregue com página em falta.",
    "Exame de glicemia repetido sem consentimento do paciente.",
    "Médico não recebeu notificação de resultado crítico de potássio.",
    "Amostra extraviada, obrigando a nova colheita.",
    "Informação de jejum incorreta fornecida na marcação.",
    "Demora na comunicação de resultado positivo de malária.",
    "Erro de unidade no resultado de creatinina (mg/dL vs µmol/L).",
    "Atendimento telefónico do laboratório sempre ocupado.",
    "Tubo de colheita com rótulo ilegível.",
    "Resultado de VIH entregue a pessoa não autorizada.",
    "Longa fila de espera apesar de marcação prévia.",
    "Cobrança de exame que estava incluído no pacote pré-natal.",
    "Relatório de coagulação sem assinatura do responsável técnico.",
    "Sala de espera sem climatização adequada.",
    "Resultado de TSH com data de colheita incorreta.",
    "Falta de informação sobre preparação para teste de tolerância à glicose.",
    "Amostra de fezes processada fora do prazo de estabilidade.",
    "Paciente não foi avisado da necessidade de repetir a colheita.",
    "Resultado impresso com baixa qualidade, difícil de ler.",
    "Reclamação sobre postura do técnico durante o atendimento.",
]

INVESTIGATIONS = {
    "closed": "Investigação concluída. Causa-raiz identificada no fluxo pré-analítico. "
              "Medidas de contenção aplicadas e comunicadas à equipa.",
    "capa": "Investigação apontou falha sistémica. Aberta ação corretiva no módulo CAPA "
            "para revisão do procedimento operacional.",
    "responded": "Análise realizada; sem falha atribuível ao laboratório. Esclarecimento "
                 "prestado ao reclamante.",
    "investigating": "Em análise pela equipa de qualidade. A recolher registos do LIS e "
                     "entrevistar colaboradores envolvidos.",
    "": "",
}

RESPONSES = {
    "responded": "Pedimos desculpa pelo sucedido. Reforçámos o procedimento junto da equipa "
                 "e informámos o reclamante das medidas adotadas.",
    "closed": "Reclamação encerrada após resposta e verificação da eficácia das medidas.",
    "capa": "Resposta enviada ao reclamante com plano de ação corretiva em curso.",
    "": "",
}

STATUS_WEIGHTS = [
    ("FECHADA", 0.30),
    ("RESPONDIDA", 0.20),
    ("INVESTIGACAO", 0.20),
    ("CAPA", 0.15),
    ("RECEBIDA", 0.15),
]


def weighted(rng):
    r = rng.random()
    acc = 0.0
    for s, w in STATUS_WEIGHTS:
        acc += w
        if r <= acc:
            return s
    return STATUS_WEIGHTS[0][0]


class Command(BaseCommand):
    help = "Cria ~30 reclamações de demonstração."

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

        now = timezone.now()
        descriptions = COMPLAINTS[:]
        rng.shuffle(descriptions)

        created = 0
        for i in range(count):
            desc = descriptions[i % len(descriptions)]
            status = weighted(rng)
            source = rng.choice(SOURCES)
            received = now - timedelta(days=rng.randint(1, 180), hours=rng.randint(0, 23))
            code = f"REC-2026-{i + 1:03d}"

            if status == "FECHADA":
                investigation = INVESTIGATIONS["closed"]
                response = RESPONSES["closed"]
            elif status == "CAPA":
                investigation = INVESTIGATIONS["capa"]
                response = RESPONSES["capa"]
            elif status == "RESPONDIDA":
                investigation = INVESTIGATIONS["responded"]
                response = RESPONSES["responded"]
            elif status == "INVESTIGACAO":
                investigation = INVESTIGATIONS["investigating"]
                response = ""
            else:  # RECEBIDA
                investigation = ""
                response = ""

            obj, was_created = CustomerComplaint.objects.get_or_create(
                tenant=tenant,
                code=code,
                defaults={
                    "source": source,
                    "received_at": received,
                    "description": desc,
                    "investigation": investigation,
                    "response": response,
                    "status": status,
                },
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Reclamações criadas: {created} (tenant {tenant.id} — {tenant.name})."
        ))
