"""Seed do catálogo de biossegurança: vias de transmissão, EPIs e perigos biológicos."""

from django.core.management.base import BaseCommand
from django.apps import apps


TRANSMISSION_ROUTES = [
    {"name": "Aerossol / Ar", "description": "Partículas infecciosas suspensas no ar (< 5 µm) que permanecem viáveis por longos períodos."},
    {"name": "Gotícula", "description": "Partículas > 5 µm expelidas ao tossir, espirrar ou falar; raio de ação < 1 m."},
    {"name": "Contacto direto", "description": "Transmissão por toque direto com pessoa, animal ou superfície contaminada."},
    {"name": "Contacto indireto (fomites)", "description": "Superfícies e objetos contaminados (bancadas, equipamentos, luvas)."},
    {"name": "Picada de agulha / cortante", "description": "Ferida percutânea com agulha, bisturi ou outro material cortante contaminado."},
    {"name": "Mucosa (olhos, boca, nariz)", "description": "Exposição de mucosas a sangue, fluidos ou aerossóis contaminados."},
    {"name": "Fecal-oral", "description": "Ingestão de material contaminado por fezes de humano ou animal."},
    {"name": "Vector (artrópode)", "description": "Transmissão por mosquito, carrapato, pulga ou outro artrópode vetor."},
    {"name": "Zoonose (animal → humano)", "description": "Passagem de agente infeccioso de animal vertebrado para humano."},
    {"name": "Inalação de pó / esporos", "description": "Esporos ou partículas secas (fungos, bacilos esporulados) inalados durante manipulação."},
]

PPE_ITEMS = [
    {"name": "Luvas de nitrilo (descartáveis)", "category": "Proteção das mãos", "unit": "par", "minimum_stock": 200},
    {"name": "Luvas de látex (descartáveis)", "category": "Proteção das mãos", "unit": "par", "minimum_stock": 200},
    {"name": "Luvas de borracha (reutilizáveis)", "category": "Proteção das mãos", "unit": "par", "minimum_stock": 10},
    {"name": "Máscara cirúrgica", "category": "Proteção respiratória", "unit": "un", "minimum_stock": 100},
    {"name": "Máscara FFP2 / N95", "category": "Proteção respiratória", "unit": "un", "minimum_stock": 50},
    {"name": "Máscara FFP3 / P100", "category": "Proteção respiratória", "unit": "un", "minimum_stock": 20},
    {"name": "Respirador de meia-face com filtro HEPA", "category": "Proteção respiratória", "unit": "un", "minimum_stock": 5},
    {"name": "Óculos de proteção (indirect vent)", "category": "Proteção ocular", "unit": "un", "minimum_stock": 10},
    {"name": "Viseira facial (face shield)", "category": "Proteção ocular/facial", "unit": "un", "minimum_stock": 5},
    {"name": "Bata de laboratório (algodão)", "category": "Proteção corporal", "unit": "un", "minimum_stock": 20},
    {"name": "Avental impermeável", "category": "Proteção corporal", "unit": "un", "minimum_stock": 10},
    {"name": "Fato de proteção Tyvek (tipo 5/6)", "category": "Proteção corporal", "unit": "un", "minimum_stock": 5},
    {"name": "Fato de isolamento total (NB-4)", "category": "Proteção corporal", "unit": "un", "minimum_stock": 2},
    {"name": "Sapatos fechados / biqueira de aço", "category": "Proteção dos pés", "unit": "par", "minimum_stock": 5},
    {"name": "Botas impermeáveis", "category": "Proteção dos pés", "unit": "par", "minimum_stock": 5},
    {"name": "Touca / gorro descartável", "category": "Proteção da cabeça", "unit": "un", "minimum_stock": 100},
    {"name": "Proteção auditiva (abafadores)", "category": "Proteção auditiva", "unit": "par", "minimum_stock": 5},
]

BIOLOGICAL_HAZARDS = [
    {
        "name": "Mycobacterium tuberculosis",
        "hazard_type": "Bactéria",
        "risk_group": "RG3",
        "containment_level": "NB3",
        "handling_notes": (
            "Manipular exclusivamente em câmara de segurança biológica classe II tipo B2 (exaustão total). "
            "Centrifugação em rotores selados ou com cobertura de segurança. "
            "Processos que geram aerossóis (sonicação, vórtex) devem ser realizados dentro da câmara. "
            "Descontaminação com hipoclorito de sódio 1% (30 min de contacto) ou autoclave a 121°C/30 min. "
            "Amostras de escarro devem ser abertas apenas na câmara. "
            "Nunca pipetar com a boca. Registar todas as exposições acidentais."
        ),
        "transmission_route_names": ["Aerossol / Ar", "Gotícula", "Inalação de pó / esporos"],
        "ppe_names": ["Luvas de nitrilo (descartáveis)", "Máscara FFP3 / P100", "Óculos de proteção (indirect vent)", "Bata de laboratório (algodão)", "Touca / gorro descartável"],
    },
    {
        "name": "SARS-CoV-2",
        "hazard_type": "Vírus",
        "risk_group": "RG3",
        "containment_level": "NB3",
        "handling_notes": (
            "Amostras diagnósticas: manipular em NB-2 com precauções de aerossol. "
            "Cultivo viral: NB-3 obrigatório. "
            "Inativação: calor 56°C/30 min ou formalina 10%. "
            "Descontaminação de superfícies: etanol 70% ou hipoclorito 0,5%."
        ),
        "transmission_route_names": ["Aerossol / Ar", "Gotícula", "Contacto direto", "Contacto indireto (fomites)"],
        "ppe_names": ["Luvas de nitrilo (descartáveis)", "Máscara FFP2 / N95", "Óculos de proteção (indirect vent)", "Viseira facial (face shield)", "Bata de laboratório (algodão)"],
    },
    {
        "name": "Hepatite B (HBV)",
        "hazard_type": "Vírus",
        "risk_group": "RG2",
        "containment_level": "NB2",
        "handling_notes": (
            "Manipular sangue e fluidos biológicos com precauções padrão. "
            "Risco de transmissão percutânea muito elevado (10–30% após picada). "
            "Vacina disponível e obrigatória para profissionais de saúde. "
            "Inativação: autoclave 121°C/30 min; hipoclorito 0,5% (10 min)."
        ),
        "transmission_route_names": ["Picada de agulha / cortante", "Mucosa (olhos, boca, nariz)", "Contacto direto"],
        "ppe_names": ["Luvas de nitrilo (descartáveis)", "Máscara cirúrgica", "Óculos de proteção (indirect vent)", "Bata de laboratório (algodão)"],
    },
    {
        "name": "Hepatite C (HCV)",
        "hazard_type": "Vírus",
        "risk_group": "RG2",
        "containment_level": "NB2",
        "handling_notes": (
            "Sem vacina disponível. Risco após picada: 1,8%. "
            "Precauções padrão para sangue e fluidos. "
            "Inativação: hipoclorito 1% (30 min); não sobrevive a esterilização seca."
        ),
        "transmission_route_names": ["Picada de agulha / cortante", "Mucosa (olhos, boca, nariz)"],
        "ppe_names": ["Luvas de nitrilo (descartáveis)", "Máscara cirúrgica", "Óculos de proteção (indirect vent)", "Bata de laboratório (algodão)"],
    },
    {
        "name": "HIV (VIH)",
        "hazard_type": "Vírus",
        "risk_group": "RG2",
        "containment_level": "NB2",
        "handling_notes": (
            "Risco após picada: 0,3%; após exposição de mucosa: 0,09%. "
            "Profilaxia pós-exposição (PPE/ARV) deve ser iniciada em < 2h. "
            "Inativação: hipoclorito 0,5% (10 min); etanol 70%; calor 56°C/30 min. "
            "Nunca recapsular agulhas com duas mãos."
        ),
        "transmission_route_names": ["Picada de agulha / cortante", "Mucosa (olhos, boca, nariz)", "Contacto direto"],
        "ppe_names": ["Luvas de nitrilo (descartáveis)", "Máscara cirúrgica", "Óculos de proteção (indirect vent)", "Bata de laboratório (algodão)"],
    },
    {
        "name": "Salmonella typhi",
        "hazard_type": "Bactéria",
        "risk_group": "RG2",
        "containment_level": "NB2",
        "handling_notes": (
            "Febre tifóide — precauções entéricas. "
            "Manipular culturas em câmara de segurança ou capuz. "
            "Desinfeção com hipoclorito 0,5% ou calor úmido. Vacina disponível."
        ),
        "transmission_route_names": ["Fecal-oral", "Contacto indireto (fomites)"],
        "ppe_names": ["Luvas de nitrilo (descartáveis)", "Máscara cirúrgica", "Bata de laboratório (algodão)"],
    },
    {
        "name": "Bacillus anthracis",
        "hazard_type": "Bactéria (esporulada)",
        "risk_group": "RG3",
        "containment_level": "NB3",
        "handling_notes": (
            "Agente de antrax — esporos extremamente resistentes (décadas no ambiente). "
            "Qualquer manipulação em NB-3 com câmara de exaustão total. "
            "Fato Tyvek + respirador de meia-face HEPA. "
            "Autoclave a 134°C/18 min para inativação de esporos. "
            "Notificação obrigatória às autoridades de saúde pública."
        ),
        "transmission_route_names": ["Inalação de pó / esporos", "Contacto direto", "Picada de agulha / cortante"],
        "ppe_names": ["Luvas de nitrilo (descartáveis)", "Respirador de meia-face com filtro HEPA", "Óculos de proteção (indirect vent)", "Fato de proteção Tyvek (tipo 5/6)", "Botas impermeáveis", "Touca / gorro descartável"],
    },
    {
        "name": "Ebola (EBOV)",
        "hazard_type": "Vírus hemorrágico",
        "risk_group": "RG4",
        "containment_level": "NB4",
        "handling_notes": (
            "Agente de nível máximo de biossegurança. Manipulação APENAS em instalações NB-4 certificadas. "
            "Fato de pressão positiva com ar fornecido (suit lab). "
            "Descontaminação de superfícies: hipoclorito 1% (30 min) ou formaldeído. "
            "Toda saída do laboratório requer duche de descontaminação químico. "
            "Notificação imediata ao nível nacional e internacional (OMS)."
        ),
        "transmission_route_names": ["Contacto direto", "Mucosa (olhos, boca, nariz)", "Picada de agulha / cortante"],
        "ppe_names": ["Fato de isolamento total (NB-4)", "Luvas de borracha (reutilizáveis)", "Botas impermeáveis"],
    },
    {
        "name": "Candida albicans",
        "hazard_type": "Fungo",
        "risk_group": "RG1",
        "containment_level": "NB1",
        "handling_notes": (
            "Fungo oportunista de baixo risco para profissionais imunocompetentes. "
            "Precauções padrão. Desinfeção com etanol 70% ou hipoclorito 0,5%."
        ),
        "transmission_route_names": ["Contacto direto", "Contacto indireto (fomites)"],
        "ppe_names": ["Luvas de nitrilo (descartáveis)", "Bata de laboratório (algodão)"],
    },
    {
        "name": "Plasmodium falciparum",
        "hazard_type": "Parasita (Protozoário)",
        "risk_group": "RG2",
        "containment_level": "NB2",
        "handling_notes": (
            "Malária grave — transmissão apenas por picada de mosquito Anopheles fêmea. "
            "Sem risco de transmissão laboratório-a-laboratório por aerossol. "
            "Precauções padrão para sangue. Esfregaços e culturas: NB-2."
        ),
        "transmission_route_names": ["Vector (artrópode)", "Picada de agulha / cortante"],
        "ppe_names": ["Luvas de nitrilo (descartáveis)", "Bata de laboratório (algodão)", "Óculos de proteção (indirect vent)"],
    },
]


class Command(BaseCommand):
    help = "Seed do catálogo de biossegurança (vias de transmissão, EPIs, perigos biológicos)"

    def add_arguments(self, parser):
        parser.add_argument("--tenant-id", type=int, default=None, help="ID do tenant (default: primeiro ativo)")
        parser.add_argument("--clear", action="store_true", help="Limpar dados existentes antes de inserir")

    def handle(self, *args, **options):
        from django.apps import apps
        from django.contrib.auth import get_user_model
        from apps.clinical_laboratory.models_biosafety import (
            TransmissionRoute, PPEItem, BiologicalHazard,
        )

        Tenant = apps.get_model("inquilinos", "Tenant")
        User = get_user_model()

        tenant_id = options.get("tenant_id")
        if tenant_id:
            tenant = Tenant.objects.get(pk=tenant_id)
        else:
            tenant = Tenant.objects.filter(active=True).first()

        if not tenant:
            self.stderr.write("Nenhum tenant ativo encontrado.")
            return

        user = User.objects.filter(is_superuser=True, tenant=tenant).first() or \
               User.objects.filter(is_superuser=True).first()

        self.stdout.write(f"Tenant: {tenant.name} (id={tenant.id})")

        if options["clear"]:
            BiologicalHazard.objects.filter(tenant=tenant).delete()
            PPEItem.objects.filter(tenant=tenant).delete()
            TransmissionRoute.objects.filter(tenant=tenant).delete()
            self.stdout.write("  Dados anteriores removidos.")

        # 1. Vias de transmissão
        self.stdout.write("\n📡 Vias de transmissão…")
        routes_map: dict[str, TransmissionRoute] = {}
        for data in TRANSMISSION_ROUTES:
            obj, created = TransmissionRoute.objects.get_or_create(
                tenant=tenant,
                name=data["name"],
                defaults={
                    "description": data["description"],
                    "active": True,
                    "created_by": user,
                    "updated_by": user,
                },
            )
            routes_map[data["name"]] = obj
            self.stdout.write(f"  {'✓ criado' if created else '· existe':12} {obj.name}")

        # 2. EPIs
        self.stdout.write("\n🧤 EPIs…")
        ppe_map: dict[str, PPEItem] = {}
        for data in PPE_ITEMS:
            obj, created = PPEItem.objects.get_or_create(
                tenant=tenant,
                name=data["name"],
                defaults={
                    "category": data["category"],
                    "unit": data["unit"],
                    "minimum_stock": data["minimum_stock"],
                    "stock_controlled": True,
                    "current_stock": 0,
                    "active": True,
                    "created_by": user,
                    "updated_by": user,
                },
            )
            ppe_map[data["name"]] = obj
            self.stdout.write(f"  {'✓ criado' if created else '· existe':12} {obj.name}")

        # 3. Perigos biológicos
        self.stdout.write("\n☣️  Perigos biológicos…")
        for data in BIOLOGICAL_HAZARDS:
            hazard, created = BiologicalHazard.objects.get_or_create(
                tenant=tenant,
                name=data["name"],
                defaults={
                    "hazard_type": data["hazard_type"],
                    "risk_group": data["risk_group"],
                    "containment_level": data["containment_level"],
                    "handling_notes": data["handling_notes"],
                    "active": True,
                    "created_by": user,
                    "updated_by": user,
                },
            )
            # assign M2M
            route_objs = [routes_map[n] for n in data["transmission_route_names"] if n in routes_map]
            ppe_objs = [ppe_map[n] for n in data["ppe_names"] if n in ppe_map]
            if created or True:
                hazard.transmission_routes.set(route_objs)
                hazard.required_ppe_items.set(ppe_objs)
            self.stdout.write(
                f"  {'✓ criado' if created else '· existe':12} "
                f"{hazard.name} ({hazard.risk_group}) "
                f"— {len(route_objs)} vias, {len(ppe_objs)} EPIs"
            )

        self.stdout.write(self.style.SUCCESS("\nSeed de biossegurança concluído."))
