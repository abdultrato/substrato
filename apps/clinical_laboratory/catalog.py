"""Catálogo padrão do laboratório clínico: sectores, exames e painéis.

Dados de referência por tenant (cada unidade configura o seu catálogo). A função
``seed_catalog`` é idempotente (get_or_create por código), pelo que pode ser
re-executada com segurança.
"""

from __future__ import annotations

from decimal import Decimal

from .models import LabSector, LabTest, LabTestPanel, SampleType

# (code, name)
SECTORS: tuple[tuple[str, str], ...] = (
    ("HEM", "Hematologia"),
    ("COA", "Coagulação"),
    ("BIO", "Bioquímica Clínica"),
    ("SER", "Serologia"),
    ("IMU", "Imunologia"),
    ("PAR", "Parasitologia"),
    ("URI", "Uroanálise"),
    ("MIC", "Microbiologia"),
    ("BAC", "Micobacteriologia / Baciloscopia"),
    ("MOL", "Biologia Molecular"),
    ("END", "Endocrinologia"),
    ("TOX", "Toxicologia"),
)

ST = SampleType
# (code, name, sector_code, sample_type, unit, reference_range, price)
TESTS: tuple[tuple, ...] = (
    # Hematologia
    ("HEMOG", "Hemograma completo", "HEM", ST.WHOLE_BLOOD, "", "", "350.00"),
    ("HGB", "Hemoglobina", "HEM", ST.WHOLE_BLOOD, "g/dL", "12 - 16", "120.00"),
    ("WBC", "Leucócitos (contagem)", "HEM", ST.WHOLE_BLOOD, "x10^9/L", "4 - 11", "120.00"),
    ("PLT", "Plaquetas", "HEM", ST.WHOLE_BLOOD, "x10^9/L", "150 - 400", "120.00"),
    ("VS", "Velocidade de sedimentação (VS)", "HEM", ST.WHOLE_BLOOD, "mm/h", "0 - 20", "100.00"),
    # Coagulação
    ("TP", "Tempo de protrombina (TP/INR)", "COA", ST.PLASMA, "s", "11 - 14", "200.00"),
    ("TTPA", "Tempo de tromboplastina parcial (TTPa)", "COA", ST.PLASMA, "s", "25 - 35", "200.00"),
    # Bioquímica
    ("GLI", "Glicose", "BIO", ST.SERUM, "mg/dL", "70 - 110", "150.00"),
    ("CREA", "Creatinina", "BIO", ST.SERUM, "mg/dL", "0.6 - 1.3", "150.00"),
    ("UREA", "Ureia", "BIO", ST.SERUM, "mg/dL", "15 - 45", "150.00"),
    ("ALT", "ALT (TGP)", "BIO", ST.SERUM, "U/L", "< 41", "180.00"),
    ("AST", "AST (TGO)", "BIO", ST.SERUM, "U/L", "< 40", "180.00"),
    ("COLT", "Colesterol total", "BIO", ST.SERUM, "mg/dL", "< 200", "180.00"),
    ("TRIG", "Triglicéridos", "BIO", ST.SERUM, "mg/dL", "< 150", "180.00"),
    ("ACU", "Ácido úrico", "BIO", ST.SERUM, "mg/dL", "3.5 - 7.2", "180.00"),
    # Serologia
    ("HIV", "Teste rápido HIV", "SER", ST.WHOLE_BLOOD, "", "Não reagente", "250.00"),
    ("HBSAG", "HBsAg (Hepatite B)", "SER", ST.SERUM, "", "Não reagente", "300.00"),
    ("RPR", "RPR / VDRL (Sífilis)", "SER", ST.SERUM, "", "Não reagente", "250.00"),
    ("WIDAL", "Widal (Febre tifóide)", "SER", ST.SERUM, "", "< 1:80", "250.00"),
    # Imunologia
    ("CRP", "Proteína C-reativa (PCR)", "IMU", ST.SERUM, "mg/L", "< 6", "250.00"),
    ("CD4", "Contagem de CD4", "IMU", ST.WHOLE_BLOOD, "células/µL", "500 - 1500", "600.00"),
    # Parasitologia
    ("MALG", "Pesquisa de plasmódio (gota espessa)", "PAR", ST.WHOLE_BLOOD, "", "Negativo", "120.00"),
    ("MRDT", "Teste rápido de malária", "PAR", ST.WHOLE_BLOOD, "", "Negativo", "120.00"),
    ("EPF", "Exame parasitológico de fezes (EPF)", "PAR", ST.STOOL, "", "Sem parasitas", "150.00"),
    # Uroanálise
    ("URINA2", "Urina II (sumária + sedimento)", "URI", ST.URINE, "", "", "150.00"),
    # Endocrinologia
    ("TSH", "TSH", "END", ST.SERUM, "µUI/mL", "0.4 - 4.0", "400.00"),
    # Microbiologia
    ("HEMOC", "Hemocultura", "MIC", ST.WHOLE_BLOOD, "", "Sem crescimento", "650.00"),
    ("UROC", "Urocultura", "MIC", ST.URINE, "", "Sem crescimento", "500.00"),
    ("CULTAB", "Cultura + antibiograma", "MIC", ST.OTHER, "", "Sem crescimento", "700.00"),
    # Baciloscopia / Micobacteriologia
    ("BAAR", "Baciloscopia (pesquisa de BAAR)", "BAC", ST.SPUTUM, "", "Negativo", "150.00"),
    ("CULTB", "Cultura de micobactérias (TB)", "BAC", ST.SPUTUM, "", "Sem crescimento", "800.00"),
    # Biologia Molecular
    ("GENEXP", "GeneXpert MTB/RIF", "MOL", ST.SPUTUM, "", "MTB não detetado", "1200.00"),
    ("CVHIV", "Carga viral HIV", "MOL", ST.PLASMA, "cópias/mL", "", "1500.00"),
    ("COVPCR", "PCR SARS-CoV-2 (COVID-19)", "MOL", ST.SWAB, "", "Não detetado", "1500.00"),
    ("HPVDNA", "HPV DNA", "MOL", ST.SWAB, "", "Não detetado", "1400.00"),
)

# (code, name, sector_code, [test_codes], package_price)
PANELS: tuple[tuple, ...] = (
    ("PHEM", "Hemograma + VS", "HEM", ["HEMOG", "VS"], "400.00"),
    ("PLIPID", "Perfil lipídico", "BIO", ["COLT", "TRIG"], "320.00"),
    ("PRENAL", "Função renal", "BIO", ["CREA", "UREA", "ACU"], "420.00"),
    ("PHEP", "Função hepática", "BIO", ["ALT", "AST"], "320.00"),
    ("PPREOP", "Painel pré-operatório", None, ["HEMOG", "GLI", "CREA", "TP", "TTPA"], "900.00"),
    ("PANTE", "Painel pré-natal", None, ["HEMOG", "HIV", "HBSAG", "RPR", "GLI"], "1100.00"),
)


def seed_catalog(tenant) -> dict:
    """Cria sectores, exames e painéis padrão para um tenant. Idempotente."""
    sectors: dict[str, LabSector] = {}
    created = {"sectors": 0, "tests": 0, "panels": 0}

    for code, name in SECTORS:
        sector, was_created = LabSector.objects.get_or_create(
            tenant=tenant, code=code, defaults={"name": name})
        sectors[code] = sector
        created["sectors"] += int(was_created)

    tests: dict[str, LabTest] = {}
    for code, name, sector_code, sample_type, unit, ref, price in TESTS:
        test, was_created = LabTest.objects.get_or_create(
            tenant=tenant, code=code,
            defaults={
                "name": name,
                "sector": sectors[sector_code],
                "sample_type": sample_type,
                "unit": unit,
                "reference_range": ref,
                "price": Decimal(price),
            },
        )
        tests[code] = test
        created["tests"] += int(was_created)

    for code, name, sector_code, test_codes, price in PANELS:
        panel, was_created = LabTestPanel.objects.get_or_create(
            tenant=tenant, code=code,
            defaults={
                "name": name,
                "sector": sectors.get(sector_code) if sector_code else None,
                "package_price": Decimal(price),
            },
        )
        if was_created:
            panel.tests.set([tests[c] for c in test_codes if c in tests])
        created["panels"] += int(was_created)

    return created
