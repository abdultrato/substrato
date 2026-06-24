"""Semeia os tipos de tubo/recipiente para coleta de amostras biológicas.

Cria o catálogo completo de tubos, frascos e recipientes usados em laboratório
clínico, com cor da tampa, aditivo/conservante, volume, inversões e condições
de conservação. Idempotente (get_or_create por código + tenant).

Uso:
    python manage.py seed_container_types
    python manage.py seed_container_types --tenant local
"""

from django.core.management.base import BaseCommand

from apps.clinical_laboratory.models import LabContainerType
from apps.tenants.models.tenant import Tenant

# ---------------------------------------------------------------------------
# Catálogo completo de recipientes
# (code, name, cap_color, additive, specimen_yields,
#  volume_ml, inversions, conservation_temperature, conservation_max_hours, notes)
# ---------------------------------------------------------------------------

C = LabContainerType.CapColor
T = LabContainerType.ConservationTemp

CONTAINERS = [
    # ── TUBOS DE SANGUE VENOSO ──────────────────────────────────────────────
    (
        "SST", "Tubo SST — Soro com Gel Separador",
        C.GOLD,
        "Gel separador + ativador de coágulo (sílica micronizada)",
        "Soro",
        5.0, 5, T.AMBIENT, 8,
        "Aguardar 30 min para retração do coágulo antes de centrifugar. "
        "Centrifugar 10 min a 2000–3000 rpm. Usar para bioquímica geral, "
        "hormonas, sorologia e imunologia.",
    ),
    (
        "SORO-SECO", "Tubo de Soro Seco (sem aditivo)",
        C.RED,
        "Sem aditivo",
        "Soro",
        5.0, 0, T.AMBIENT, 6,
        "Aguardar 30–60 min para retração espontânea do coágulo. "
        "Centrifugar 10 min a 2000 rpm. Indicado quando o gel separador "
        "pode interferir com o analito (ex.: alguns fármacos).",
    ),
    (
        "EDTA-K3", "Tubo EDTA K3 — Sangue Total",
        C.PURPLE,
        "EDTA tripotássico (K3EDTA) — anticoagulante por quelação do cálcio",
        "Sangue total",
        3.0, 8, T.AMBIENT, 24,
        "Inverter suavemente 8× imediatamente após a coleta para "
        "homogeneizar o EDTA. Não centrifugar. Indicado para hemograma "
        "completo, reticulócitos, esfregaço e tipagem sanguínea.",
    ),
    (
        "EDTA-K2", "Tubo EDTA K2 — Sangue Total (EDTA Liofilizado)",
        C.PURPLE,
        "EDTA dipotássico (K2EDTA) liofilizado",
        "Sangue total",
        3.0, 8, T.AMBIENT, 24,
        "Equivalente ao EDTA K3; preferido para alguns analisadores. "
        "Inverter 8× imediatamente após a coleta.",
    ),
    (
        "CIT-3.2", "Tubo Citrato de Sódio 3,2 % — Coagulação",
        C.LIGHT_BLUE,
        "Citrato de sódio 3,2 % (proporção 9:1 sangue:citrato)",
        "Plasma citratado",
        2.7, 4, T.COLD, 4,
        "CRÍTICO: encher até à marca exata. Proporção incorreta invalida "
        "o resultado. Inverter 4× suavemente. Processar em 1 h ou centrifugar "
        "e congelar plasma. Indicado para TP, TTPA, fibrinogênio, D-dímero, "
        "fator de Von Willebrand.",
    ),
    (
        "FLUORETO", "Tubo Fluoreto/Oxalato — Glicemia e Lactato",
        C.GREY,
        "Fluoreto de sódio (inibidor glicolítico) + Oxalato de potássio (anticoagulante)",
        "Sangue total / Plasma",
        2.0, 8, T.COLD, 24,
        "Inverter 8× imediatamente. Processar em 30 min para glicemia de "
        "jejum; o fluoreto inibe a glicólise nos eritrócitos. Indicado para "
        "glicemia, teste de tolerância à glicose (OGTT) e lactato.",
    ),
    (
        "HEP-LI", "Tubo Heparina de Lítio — Plasma Heparinizado",
        C.DARK_GREEN,
        "Heparina de lítio (anticoagulante por inativação da trombina)",
        "Plasma heparinizado",
        4.0, 8, T.COLD, 8,
        "Inverter 8× imediatamente. Centrifugar 10 min a 2000 rpm. "
        "Indicado para eletrólitos (Na, K, Cl), gasometria, função renal "
        "urgente e amónia. Não usar para tipagem sanguínea ou coagulação.",
    ),
    (
        "HEP-GEL", "Tubo Heparina com Gel Separador",
        C.LIGHT_GREEN,
        "Heparina de lítio + gel separador",
        "Plasma separado",
        4.0, 8, T.COLD, 48,
        "Inverter 8× e centrifugar. O gel separa plasma dos elementos "
        "celulares. Maior estabilidade pós-centrifugação. Indicado para "
        "bioquímica urgente e testes de função hepática.",
    ),
    (
        "ACD-A", "Tubo ACD-A — Banco de Sangue e Imunofenotipagem",
        C.YELLOW,
        "ACD solução A: ácido cítrico + citrato de sódio + dextrose",
        "Sangue total anticoagulado",
        8.5, 8, T.AMBIENT, 48,
        "Inverter 8×. Preserva a viabilidade celular. Indicado para "
        "tipagem HLA, imunofenotipagem, banco de sangue, teste de Coombs "
        "indireto e estudos de cultura celular.",
    ),
    (
        "EDTA-PED", "Tubo EDTA Pediátrico (Microtainer)",
        C.PURPLE,
        "EDTA K2 ou K3 — volume reduzido para pediatria",
        "Sangue total",
        0.5, 8, T.AMBIENT, 24,
        "Ideal para punção capilar no calcanhar ou ponta do dedo. "
        "Inverter 8×. Volume mínimo 0,25 mL. Indicado para hemograma, "
        "glicemia, gasometria capilar em neonatos e lactentes.",
    ),
    (
        "EDTA-MOL", "Tubo EDTA para Biologia Molecular / PCR",
        C.PURPLE,
        "EDTA K2 livre de DNAses — preserva ácidos nucleicos",
        "Sangue total (DNA/RNA)",
        4.0, 8, T.COLD, 72,
        "Inverter 8×. Processar o mais rapidamente possível. "
        "Para extração de DNA ou RNA congelar a −20 °C. Indicado para "
        "PCR, carga viral (HIV, HBV, HCV, CMV), genotipagem e biologia molecular.",
    ),
    (
        "PAX-RNA", "Tubo PAXgene — Preservação de RNA",
        C.BROWN,
        "Reagente de estabilização de RNA (PAXgene Blood RNA System)",
        "RNA estabilizado",
        2.5, 10, T.AMBIENT, 72,
        "Inverter 10× imediatamente. Deixar à temperatura ambiente "
        "2 h antes de congelar a −20 °C ou −80 °C. Indicado para "
        "estudos de expressão génica e transcriptómica.",
    ),
    (
        "SORO-GEL-PED", "Microtainer Soro com Gel (Pediátrico)",
        C.GOLD,
        "Gel separador + ativador de coágulo — volume reduzido",
        "Soro",
        0.5, 5, T.AMBIENT, 8,
        "Para coleta capilar pediátrica. Aguardar retração do coágulo "
        "antes de centrifugar. Indicado para bioquímica neonatal.",
    ),

    # ── HEMOCULTURAS ────────────────────────────────────────────────────────
    (
        "HEMOC-AER", "Frasco de Hemocultura Aeróbia",
        C.NONE,
        "Caldo de cultura aeróbio (ex.: BacT/ALERT FA Plus, BACTEC Plus Aerobic)",
        "Sangue para cultura",
        8.0 if True else None, 10, T.INCUBATOR, 5 * 24,
        "Inocular 8–10 mL de sangue em adulto (1–3 mL em criança). "
        "Desinfetar o septo com clorohexidina 2 % ou álcool 70 %. "
        "Transportar a 35–37 °C ou à temperatura ambiente até incubar. "
        "Não refrigerar. Par com frasco anaeróbio se suspeita de sepse.",
    ),
    (
        "HEMOC-ANA", "Frasco de Hemocultura Anaeróbia",
        C.NONE,
        "Caldo de cultura anaeróbio (ex.: BacT/ALERT FN Plus, BACTEC Plus Anaerobic)",
        "Sangue para cultura",
        8.0, 10, T.INCUBATOR, 5 * 24,
        "Inocular 8–10 mL de sangue. Não introduzir ar. "
        "Transportar à temperatura ambiente até incubar a 35–37 °C. "
        "Indicado para suspeita de bacteriemia por anaeróbios.",
    ),
    (
        "HEMOC-PED", "Frasco de Hemocultura Pediátrico",
        C.NONE,
        "Caldo pediátrico de cultura (ex.: BacT/ALERT PF Plus)",
        "Sangue para cultura",
        3.0, 5, T.INCUBATOR, 5 * 24,
        "Volume ideal 1–3 mL de sangue. Não refrigerar. Transportar "
        "à temperatura ambiente. Indicado para neonatos e crianças.",
    ),

    # ── URINA ───────────────────────────────────────────────────────────────
    (
        "URINA-EST", "Frasco de Urina Estéril",
        C.TRANSPARENT,
        "Sem aditivo — recipiente estéril",
        "Urina",
        10.0, 0, T.COLD, 2,
        "Coletar jato médio da primeira urina da manhã após higiene genital. "
        "Processar em 2 h ou refrigerar até 24 h. Indicado para urina tipo II "
        "(sumária + sedimento) e urocultura.",
    ),
    (
        "URINA-24H", "Recipiente Urina 24 Horas",
        C.TRANSPARENT,
        "Pode conter conservante específico conforme analito (HCl, ácido bórico, etc.)",
        "Urina das 24 horas",
        None, 0, T.COLD, 24,
        "Desprezar a primeira micção ao acordar. Recolher toda a urina "
        "nas 24 h seguintes, incluindo a primeira do dia seguinte. "
        "Manter refrigerada durante a coleta. Anotar o volume total. "
        "Indicado para proteinúria 24 h, creatinina urinária, catecolaminas, "
        "metanefrinas, cortisol urinário e clearance de creatinina.",
    ),
    (
        "URINA-BORIC", "Frasco Urina com Ácido Bórico",
        C.BROWN,
        "Ácido bórico como conservante urinário",
        "Urina",
        10.0, 0, T.AMBIENT, 48,
        "Coleta de jato médio em recipiente com ácido bórico. "
        "O ácido bórico preserva as bactérias sem inibir o crescimento. "
        "Indicado para urocultura quando o transporte demorará > 2 h.",
    ),
    (
        "URINA-CITOL", "Recipiente Urina para Citologia",
        C.TRANSPARENT,
        "CytoLyt ou solução fixadora de células",
        "Urina",
        50.0, 0, T.COLD, 24,
        "Coletar urina fresca ou fixada. Para citologia urinária (células "
        "uroteliais, células tumorais) e pesquisa de parasitas (ex.: Schistosoma).",
    ),

    # ── FEZES / COPRO ────────────────────────────────────────────────────────
    (
        "FEZES", "Frasco de Fezes",
        C.NONE,
        "Sem conservante — recipiente com colher de coleta",
        "Fezes",
        5.0, 0, T.COLD, 2,
        "Coletar amostra do tamanho de uma noz (~5 g) em recipiente limpo "
        "e seco. Evitar contaminação com urina ou água. Processar em 2 h "
        "ou refrigerar até 24 h. Indicado para coprológico, pesquisa de "
        "parasitas, coproculturas e antígenos fecais.",
    ),
    (
        "FEZES-SAF", "Frasco de Fezes com Fixador SAF",
        C.NONE,
        "SAF (acetato de sódio + ácido acético + formol) — fixador e conservante",
        "Fezes fixadas",
        2.0, 0, T.AMBIENT, 7 * 24,
        "Misturar fezes com solução SAF (proporção 1:3). Agitar bem. "
        "Estável à temperatura ambiente por até 7 dias. Indicado para "
        "parasitologia quando o transporte for demorado.",
    ),

    # ── ESCARRO / RESPIRATÓRIO ───────────────────────────────────────────────
    (
        "ESCARRO", "Recipiente de Escarro",
        C.TRANSPARENT,
        "Sem aditivo — recipiente estéril de boca larga",
        "Escarro",
        5.0, 0, T.COLD, 2,
        "Coletar pela manhã, em jejum, após enxaguar a boca com água. "
        "Expectorar profundamente (não saliva). Volume mínimo 3 mL. "
        "Processar em 2 h. Indicado para baciloscopia de BAAR, cultura de "
        "Koch, antígeno de Legionella/Pneumococcus e exame micológico.",
    ),
    (
        "ESCARRO-INO", "Recipiente de Escarro com Conservante (Ino-Cire)",
        C.NONE,
        "Conservante mycobacteriano (ex.: CPC — cetilpiridínio + cloreto de sódio)",
        "Escarro conservado",
        5.0, 0, T.AMBIENT, 7 * 24,
        "Para transporte de amostras respiratórias para diagnóstico de "
        "tuberculose quando o laboratório está distante. Estável até 7 dias.",
    ),
    (
        "LBA", "Recipiente para Lavado Broncoalveolar (LBA)",
        C.TRANSPARENT,
        "Sem aditivo — recipiente estéril",
        "Líquido broncoalveolar",
        20.0, 0, T.COLD, 1,
        "Coleta por broncoscopia. Transportar imediatamente em gelo. "
        "Processar em 1 h. Indicado para pneumonia em imunodeprimidos, "
        "pesquisa de Pneumocystis, CMV, BAAR e fungos.",
    ),

    # ── LÍQUIDOS BIOLÓGICOS ──────────────────────────────────────────────────
    (
        "LCR", "Tubo de LCR Estéril",
        C.TRANSPARENT,
        "Sem aditivo — tubos numerados de 1 a 4",
        "Líquor cefalorraquidiano",
        2.0, 0, T.AMBIENT, 1,
        "O médico coleta por punção lombar em condições assépticas. "
        "Enviar os 4 tubos numerados: 1 e 2 para microbiologia/citologia, "
        "3 para bioquímica, 4 reserva. Processar IMEDIATAMENTE. "
        "Não refrigerar — o LCR não deve ser congelado para citologia.",
    ),
    (
        "LIQUIDO-EST", "Frasco Estéril para Líquido Biológico",
        C.TRANSPARENT,
        "Sem aditivo — recipiente estéril",
        "Líquido biológico (pleural, ascítico, sinovial, peritoneal)",
        10.0, 0, T.COLD, 2,
        "Coleta por punção guiada por médico. Enviar parte em frasco "
        "estéril (microbiologia) e parte em tubo EDTA (citologia). "
        "Processar em 2 h ou refrigerar.",
    ),

    # ── ZARAGATOAS / SWABS ──────────────────────────────────────────────────
    (
        "SWAB-EST", "Zaragatoa/Swab Estéril (meio de transporte Amies)",
        C.NONE,
        "Meio de transporte de Amies (carvão) para preservação bacteriana",
        "Swab",
        None, 0, T.COLD, 24,
        "Colher com técnica asséptica (garganta, ferida, lesão, úretral, "
        "vaginal, retal, nasal). Inserir no meio de transporte imediatamente. "
        "Refrigerar e processar em 24 h. Para culturas e coloração de Gram.",
    ),
    (
        "SWAB-VIRAL", "Swab com Meio de Transporte Viral (VTM)",
        C.NONE,
        "Meio de transporte viral (VTM) — solução balanced com antibióticos",
        "Swab nasofaríngeo / orofaríngeo",
        None, 0, T.COLD, 48,
        "Swab nasofaríngeo para diagnóstico viral (influenza, SARS-CoV-2, "
        "RSV, adenovírus). Congelar a −70 °C se não for processar em 48 h. "
        "Não usar meio de Amies para virologia.",
    ),
    (
        "SWAB-PCR", "Swab Seco para PCR (sem meio de transporte)",
        C.NONE,
        "Sem aditivo — swab de nylon flocado ou Dacron",
        "Material para PCR",
        None, 0, T.COLD, 72,
        "Para diagnóstico molecular rápido. Inserir diretamente em "
        "tubo de extração ou em solução salina. Congelar se não processar em 72 h.",
    ),

    # ── OUTROS ──────────────────────────────────────────────────────────────
    (
        "PAPEL-FILTRO", "Papel de Filtro — Triagem Neonatal (Teste do Pezinho)",
        C.NONE,
        "Papel de filtro Whatman 903 especial para triagem neonatal",
        "Sangue seco em papel de filtro",
        None, 0, T.AMBIENT, 30 * 24,
        "Punção no calcanhar do recém-nascido após 48–72 h de vida. "
        "Preencher os 5 círculos completamente. Secar ao ar por 3 h "
        "à temperatura ambiente, longe de luz direta. Não refrigerar antes de secar. "
        "Indicado para PKU, hipotiroidismo congênito, hiperplasia adrenal, "
        "hemoglobinopatias e fibrose cística.",
    ),
    (
        "BIOP-FORMOL", "Recipiente para Biópsia com Formol 10 %",
        C.NONE,
        "Formol tamponado neutro a 10 % (fixador histológico)",
        "Tecido biológico fixado",
        None, 0, T.AMBIENT, None,
        "Mergulhar o fragmento de tecido em formol em volume 10× "
        "o volume da peça. Rotular com nome, data e local da biópsia. "
        "Não congelar. Indicado para histopatologia, anatomia patológica "
        "e imunohistoquímica.",
    ),
    (
        "BIOP-FRESCO", "Recipiente para Biópsia a Fresco (sem fixador)",
        C.NONE,
        "Sem aditivo — recipiente estéril com soro fisiológico",
        "Tecido fresco",
        None, 0, T.COLD, 1,
        "Tecido em soro fisiológico estéril. Transportar em gelo. "
        "Processar em 1 h. Indicado para microbiologia (cultura de tecido), "
        "citogenética e biologia molecular.",
    ),
    (
        "SEMEN-EST", "Recipiente Estéril para Sémen",
        C.TRANSPARENT,
        "Sem aditivo — recipiente estéril de boca larga",
        "Sémen",
        None, 0, T.AMBIENT, 1,
        "Abstinência sexual 2–7 dias antes da coleta. Recolher por "
        "masturbação em recipiente estéril fornecido pelo laboratório. "
        "Manter a 37 °C e processar em 30–60 min. Indicado para "
        "espermograma, espermocultura e processamento para fertilização.",
    ),
    (
        "MEDULA", "Seringa/Tubo para Medula Óssea",
        C.NONE,
        "EDTA K3 (anticoagulante) para citologia; heparina para cultura/citogenética",
        "Aspirado de medula óssea",
        2.0, 8, T.AMBIENT, 4,
        "Coleta por punção esternal ou ilíaca pelo médico. "
        "1ª seringa: 1–2 mL para esfregaços e citologia (EDTA). "
        "Seringas seguintes: para biópsia, cultura, citogenética e imunofenotipagem. "
        "Processar IMEDIATAMENTE — a medula coagula rapidamente.",
    ),
]


class Command(BaseCommand):
    help = "Cria/actualiza o catálogo de tipos de tubo e recipiente para coleta de amostras."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", help="identifier do tenant (omitir = todos os ativos)")

    def handle(self, *args, **options):
        tenant_ref = options.get("tenant")
        if tenant_ref:
            tenant = (
                Tenant.all_objects.filter(identifier=tenant_ref).first()
                or (Tenant.all_objects.filter(pk=tenant_ref).first() if str(tenant_ref).isdigit() else None)
            )
            if not tenant:
                self.stderr.write(self.style.ERROR(f"Tenant não encontrado: {tenant_ref}"))
                return
            tenants = [tenant]
        else:
            tenants = list(Tenant.objects.all())

        if not tenants:
            self.stdout.write(self.style.WARNING("Nenhum tenant encontrado."))
            return

        for tenant in tenants:
            created_count = updated_count = 0

            for (
                code, name, cap_color, additive, specimen_yields,
                volume_ml, inversions, conservation_temperature,
                conservation_max_hours, notes,
            ) in CONTAINERS:
                obj, was_created = LabContainerType.objects.get_or_create(
                    tenant=tenant,
                    code=code,
                    defaults={
                        "name": name,
                        "cap_color": cap_color,
                        "additive": additive,
                        "specimen_yields": specimen_yields,
                        "volume_ml": volume_ml,
                        "inversions": inversions,
                        "conservation_temperature": conservation_temperature,
                        "conservation_max_hours": conservation_max_hours,
                        "notes": notes,
                        "active": True,
                    },
                )

                if not was_created:
                    # Actualiza campos que podem ter mudado
                    obj.name = name
                    obj.cap_color = cap_color
                    obj.additive = additive
                    obj.specimen_yields = specimen_yields
                    obj.volume_ml = volume_ml
                    obj.inversions = inversions
                    obj.conservation_temperature = conservation_temperature
                    obj.conservation_max_hours = conservation_max_hours
                    obj.notes = notes
                    obj.save(update_fields=[
                        "name", "cap_color", "additive", "specimen_yields",
                        "volume_ml", "inversions", "conservation_temperature",
                        "conservation_max_hours", "notes", "updated_at",
                    ])
                    updated_count += 1
                else:
                    created_count += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f"[{tenant.identifier}] Recipientes: +{created_count} criados, {updated_count} actualizados."
                )
            )
