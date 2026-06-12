"""Catálogo padrão do laboratório clínico: sectores, exames e painéis.

Dados de referência por tenant (cada unidade configura o seu catálogo). A função
``seed_catalog`` é idempotente (get_or_create por código), pelo que pode ser
re-executada com segurança.
"""

from __future__ import annotations

from decimal import Decimal
import re
import unicodedata

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


# Perfis ocupacionais (saúde no trabalho): cada perfil agrupa os exames de
# laboratório de rastreio por tipo de trabalho. SUGESTÃO inicial composta a
# partir do catálogo existente — rever/ajustar conforme a regulação aplicável
# e o protocolo da instituição (não constitui validação clínica).
# (code, name, occupation, [test_codes], package_price)
OCCUPATIONAL_PROFILES: tuple[tuple, ...] = (
    ("POCC-ADM", "Perfil Ocupacional — Admissional Geral", "Admissional geral",
     ["HEMOG", "GLI", "URINA2", "RPR", "HIV"], "700.00"),
    ("POCC-COND", "Perfil Ocupacional — Motorista/Condutor", "Motorista / condutor",
     ["HEMOG", "GLI", "COLT", "TRIG", "CREA", "URINA2"], "950.00"),
    ("POCC-ALIM", "Perfil Ocupacional — Manipulador de Alimentos", "Manipulador de alimentos",
     ["HEMOG", "EPF", "URINA2", "UROC", "HBSAG"], "850.00"),
    ("POCC-QUIM", "Perfil Ocupacional — Exposição a Químicos/Solventes", "Exposição a químicos/solventes",
     ["HEMOG", "ALT", "AST", "UREA", "CREA", "URINA2"], "1000.00"),
    ("POCC-ALT", "Perfil Ocupacional — Trabalho em Altura", "Trabalho em altura",
     ["HEMOG", "GLI", "URINA2"], "600.00"),
    ("POCC-SAUDE", "Perfil Ocupacional — Profissionais de Saúde", "Profissionais de saúde",
     ["HEMOG", "HBSAG", "HIV", "RPR", "BAAR"], "1100.00"),
)


LEGACY_SECTOR_MAP: dict[str, tuple[str, str]] = {
    "Hematologia": ("HEM", "Hematologia"),
    "Bioquimica": ("BIO", "Bioquímica Clínica"),
    "Microbiologia": ("MIC", "Microbiologia"),
    "Imunologia": ("IMU", "Imunologia"),
    "Serologia": ("SER", "Serologia"),
    "Parasitologia": ("PAR", "Parasitologia"),
    "BiologiaMolecular": ("MOL", "Biologia Molecular"),
    "Toxicologia": ("TOX", "Toxicologia"),
    "Hormonios": ("END", "Endocrinologia"),
    "MarcadoresTumorais": ("TUM", "Marcadores Tumorais"),
    "Coagulacao": ("COA", "Coagulação"),
    "Urinalise": ("URI", "Uroanálise"),
    "LiquidosCorporais": ("LIQ", "Líquidos Corporais"),
    "Gasometria": ("GAS", "Gasometria"),
    "NutricaoClinica": ("NUT", "Nutrição Clínica"),
    "Micologia": ("MYC", "Micologia"),
    "Virologia": ("VIR", "Virologia"),
    "Bacteriologia": ("BAC", "Bacteriologia"),
    "BancoSangue": ("BSG", "Banco de Sangue"),
    "ImunoHematologia": ("IHM", "Imuno-hematologia"),
    "Triagem": ("TRI", "Triagem Laboratorial"),
    "RecepcaoAmostras": ("REC", "Recepção de Amostras"),
    "ControleQualidade": ("CQ", "Controle de Qualidade"),
    "Pesquisa": ("PES", "Pesquisa Laboratorial"),
    "Outro": ("OUT", "Outro"),
}


def _ascii_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).casefold()


def _legacy_sector(raw_sector: str) -> tuple[str, str]:
    raw = str(raw_sector or "").strip() or "Outro"
    mapped = LEGACY_SECTOR_MAP.get(raw)
    if mapped:
        return mapped

    code = re.sub(r"[^A-Za-z0-9]+", "", raw.upper())[:12] or "OUT"
    return f"LEG{code}"[:20], raw


def _legacy_sample_type(sample) -> str:
    name = _ascii_key(getattr(sample, "name", ""))
    if "urina" in name:
        return SampleType.URINE
    if "fez" in name or "fezes" in name:
        return SampleType.STOOL
    if "escarro" in name:
        return SampleType.SPUTUM
    if "liquor" in name or "lcr" in name:
        return SampleType.CSF
    if "plasma" in name:
        return SampleType.PLASMA
    if "swab" in name or "zaragatoa" in name or "secrecao" in name:
        return SampleType.SWAB
    if "esperma" in name or "semen" in name:
        return SampleType.SEMEN
    if "medula" in name:
        return SampleType.BONE_MARROW
    if "liquido" in name:
        return SampleType.BODY_FLUID
    if "sangue" in name:
        return SampleType.WHOLE_BLOOD
    if "soro" in name:
        return SampleType.SERUM
    return SampleType.OTHER


def _legacy_code(legacy_exam) -> str:
    custom_id = str(getattr(legacy_exam, "custom_id", "") or "").strip()
    if custom_id and len(custom_id) <= 30:
        return custom_id
    return f"LEG-{legacy_exam.pk}"


def sync_legacy_lab_exams(tenant=None) -> dict:
    """Copia exames do catálogo legado ``clinical.LabExam`` para o LIS.

    O novo módulo de Laboratório Clínico usa ``LabTest``. Esta sincronização
    mantém o catálogo novo idempotente sem apagar nem mover os exames legados.
    """
    from apps.clinical.models.lab_exam import LabExam

    queryset = LabExam.objects.select_related("tenant", "sample_type").all()
    if tenant is not None:
        queryset = queryset.filter(tenant=tenant)

    stats = {"legacy_tests": 0, "legacy_skipped": 0, "legacy_sectors": 0}
    for legacy_exam in queryset.order_by("tenant_id", "sector", "name", "id"):
        if not legacy_exam.tenant_id or not (legacy_exam.name or "").strip():
            stats["legacy_skipped"] += 1
            continue

        sector_code, sector_name = _legacy_sector(getattr(legacy_exam, "sector", ""))
        sector, sector_created = LabSector.objects.get_or_create(
            tenant=legacy_exam.tenant,
            code=sector_code,
            defaults={"name": sector_name},
        )
        stats["legacy_sectors"] += int(sector_created)

        code = _legacy_code(legacy_exam)
        if LabTest.objects.filter(tenant=legacy_exam.tenant, code=code, deleted=False).exists():
            stats["legacy_skipped"] += 1
            continue
        if LabTest.objects.filter(tenant=legacy_exam.tenant, name__iexact=legacy_exam.name, deleted=False).exists():
            stats["legacy_skipped"] += 1
            continue

        custom_id = f"LTST-LEG-{legacy_exam.tenant_id}-{legacy_exam.id}"
        if LabTest.all_objects.filter(custom_id=custom_id).exists():
            custom_id = None

        LabTest.objects.create(
            tenant=legacy_exam.tenant,
            custom_id=custom_id,
            code=code,
            name=legacy_exam.name,
            sector=sector,
            sample_type=_legacy_sample_type(getattr(legacy_exam, "sample_type", None)),
            method=str(getattr(legacy_exam, "method", "") or "")[:120],
            price=getattr(legacy_exam, "price", Decimal("0.00")) or Decimal("0.00"),
            turnaround_hours=getattr(legacy_exam, "turnaround_hours", None) or 24,
            requires_fasting=bool(getattr(getattr(legacy_exam, "sample_type", None), "fasting_required", False)),
            active=True,
        )
        stats["legacy_tests"] += 1

    return stats


def seed_catalog(tenant, *, include_legacy: bool = True) -> dict:
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

    created["occupational_profiles"] = 0
    for code, name, occupation, test_codes, price in OCCUPATIONAL_PROFILES:
        profile, was_created = LabTestPanel.objects.get_or_create(
            tenant=tenant, code=code,
            defaults={
                "name": name,
                "package_price": Decimal(price),
                "profile_type": LabTestPanel.ProfileType.OCCUPATIONAL,
                "occupation": occupation,
            },
        )
        if was_created:
            profile.tests.set([tests[c] for c in test_codes if c in tests])
        created["occupational_profiles"] += int(was_created)

    if include_legacy:
        created.update(sync_legacy_lab_exams(tenant))

    return created
