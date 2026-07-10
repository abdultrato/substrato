"""Catálogo padrão do laboratório clínico: sectores, tubos, exames e painéis.

Dados de referência por tenant (cada unidade configura o seu catálogo). A função
``seed_catalog`` é idempotente (get_or_create/update por código), pelo que pode ser
re-executada com segurança — inclusive para enriquecer exames já semeados com os
campos técnicos (método, tubo, limiares de referência/pânico, TAT, jejum).

Fontes de referência para os intervalos: valores adultos de consenso amplamente
publicados (ex.: Tietz Fundamentals of Clinical Chemistry, Henry's Clinical
Diagnosis and Management by Laboratory Methods) — servem de base editável; cada
unidade deve validar/ajustar contra o seu próprio analisador e população.
"""

from __future__ import annotations

from decimal import Decimal
import re
import unicodedata

from apps.clinical_laboratory.management.commands.seed_container_types import (
    CONTAINERS as CONTAINER_DEFS,
)
from core.constants.laboratory.units import DefaultUnit

from .models import LabContainerType, LabMethod, LabSector, LabTest, LabTestField, LabTestPanel, SampleType

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
LM = LabMethod

# Cada entrada:
# (code, name, sector_code, sample_type, container_code, method, unit,
#  reference_range, reference_low, reference_high, critical_low, critical_high,
#  turnaround_hours, requires_fasting, requires_consent, price)
#
# `container_code` refere um código de ``LabContainerType`` (ver
# ``seed_container_types.py``) ou None quando a colheita não usa tubo próprio
# (ex.: testes rápidos por picada digital). Limiares `None` significam "não
# aplicável a este exame de valor único" (ex.: painéis multi-analito como o
# hemograma, cujos limiares vivem em ``LabTestField`` por analito).
TESTS: tuple[tuple, ...] = (
    # ── Hematologia ──────────────────────────────────────────────────────
    ("HEMOG", "Hemograma completo", "HEM", ST.WHOLE_BLOOD, "EDTA-K3", LM.HEMATOLOGIAAUTOMATIZADA,
     "", "", None, None, None, None, 4, False, False, "350.00"),
    ("HGB", "Hemoglobina", "HEM", ST.WHOLE_BLOOD, "EDTA-K3", LM.HEMATOLOGIAAUTOMATIZADA,
     "g/dL", "12.0 - 16.0", Decimal("12.0"), Decimal("16.0"), Decimal("7.0"), Decimal("20.0"),
     4, False, False, "120.00"),
    ("WBC", "Leucócitos (contagem)", "HEM", ST.WHOLE_BLOOD, "EDTA-K3", LM.HEMATOLOGIAAUTOMATIZADA,
     "x10^9/L", "4.0 - 11.0", Decimal("4.0"), Decimal("11.0"), Decimal("1.0"), Decimal("30.0"),
     4, False, False, "120.00"),
    ("PLT", "Plaquetas", "HEM", ST.WHOLE_BLOOD, "EDTA-K3", LM.HEMATOLOGIAAUTOMATIZADA,
     "x10^9/L", "150 - 400", Decimal("150"), Decimal("400"), Decimal("20"), Decimal("1000"),
     4, False, False, "120.00"),
    ("VS", "Velocidade de sedimentação (VS)", "HEM", ST.WHOLE_BLOOD, "CIT-3.2", LM.SEDIMENTACAO,
     "mm/h", "0 - 20", Decimal("0"), Decimal("20"), None, None, 2, False, False, "100.00"),
    ("RETIC", "Reticulócitos", "HEM", ST.WHOLE_BLOOD, "EDTA-K3", LM.MICROSCOPICO,
     "%", "0.5 - 2.5", Decimal("0.5"), Decimal("2.5"), None, None, 24, False, False, "150.00"),
    ("ESFREG", "Esfregaço de sangue periférico", "HEM", ST.WHOLE_BLOOD, "EDTA-K3", LM.MICROSCOPIAOPTICA,
     "", "Morfologia normal", None, None, None, None, 24, False, False, "180.00"),
    ("HBA1C", "Hemoglobina glicada (HbA1c)", "HEM", ST.WHOLE_BLOOD, "EDTA-K3", LM.HPLC,
     "%", "< 5.7", None, Decimal("5.7"), None, Decimal("14.0"), 24, False, False, "350.00"),

    # ── Coagulação ───────────────────────────────────────────────────────
    ("TP", "Tempo de protrombina (TP/INR)", "COA", ST.PLASMA, "CIT-3.2", LM.COAGULOMETRIA,
     "s", "11 - 14", Decimal("11"), Decimal("14"), None, Decimal("30"), 2, False, False, "200.00"),
    ("TTPA", "Tempo de tromboplastina parcial ativado (TTPa)", "COA", ST.PLASMA, "CIT-3.2",
     LM.COAGULOMETRIA, "s", "25 - 35", Decimal("25"), Decimal("35"), None, Decimal("70"),
     2, False, False, "200.00"),
    ("FIB", "Fibrinogénio", "COA", ST.PLASMA, "CIT-3.2", LM.COAGULOMETRIA,
     "mg/dL", "200 - 400", Decimal("200"), Decimal("400"), Decimal("100"), None, 4, False, False, "220.00"),
    ("DDIM", "D-dímero", "COA", ST.PLASMA, "CIT-3.2", LM.IMUNOTURBIDIMETRIA,
     "ng/mL FEU", "< 500", None, Decimal("500"), None, None, 4, False, False, "380.00"),

    # ── Bioquímica ───────────────────────────────────────────────────────
    ("GLI", "Glicose", "BIO", ST.PLASMA, "FLUORETO", LM.ENZIMATICO,
     "mg/dL", "70 - 110", Decimal("70"), Decimal("110"), Decimal("40"), Decimal("500"),
     2, True, False, "150.00"),
    ("CREA", "Creatinina", "BIO", ST.SERUM, "SST", LM.CINETICOCOLORIMETRICO,
     "mg/dL", "0.6 - 1.3", Decimal("0.6"), Decimal("1.3"), None, Decimal("10.0"), 4, False, False, "150.00"),
    ("UREA", "Ureia", "BIO", ST.SERUM, "SST", LM.ENZIMATICO,
     "mg/dL", "15 - 45", Decimal("15"), Decimal("45"), None, Decimal("150"), 4, False, False, "150.00"),
    ("ALT", "ALT (TGP)", "BIO", ST.SERUM, "SST", LM.CINETICOENZIMATICO,
     "U/L", "< 41", None, Decimal("41"), None, None, 4, False, False, "180.00"),
    ("AST", "AST (TGO)", "BIO", ST.SERUM, "SST", LM.CINETICOENZIMATICO,
     "U/L", "< 40", None, Decimal("40"), None, None, 4, False, False, "180.00"),
    ("COLT", "Colesterol total", "BIO", ST.SERUM, "SST", LM.ENZIMATICOCOLORIMETRICO,
     "mg/dL", "< 200", None, Decimal("200"), None, None, 4, True, False, "180.00"),
    ("TRIG", "Triglicéridos", "BIO", ST.SERUM, "SST", LM.ENZIMATICOCOLORIMETRICO,
     "mg/dL", "< 150", None, Decimal("150"), None, None, 4, True, False, "180.00"),
    ("ACU", "Ácido úrico", "BIO", ST.SERUM, "SST", LM.ENZIMATICOCOLORIMETRICO,
     "mg/dL", "3.5 - 7.2", Decimal("3.5"), Decimal("7.2"), None, None, 4, False, False, "180.00"),
    ("NA", "Sódio (Na+)", "BIO", ST.SERUM, "HEP-LI", LM.ELETRODOIONSELETIVO,
     "mEq/L", "135 - 145", Decimal("135"), Decimal("145"), Decimal("120"), Decimal("160"),
     2, False, False, "130.00"),
    ("K", "Potássio (K+)", "BIO", ST.SERUM, "HEP-LI", LM.ELETRODOIONSELETIVO,
     "mEq/L", "3.5 - 5.1", Decimal("3.5"), Decimal("5.1"), Decimal("2.5"), Decimal("6.5"),
     2, False, False, "130.00"),
    ("CL", "Cloro (Cl-)", "BIO", ST.SERUM, "SST", LM.ELETRODOIONSELETIVO,
     "mEq/L", "98 - 107", Decimal("98"), Decimal("107"), None, None, 2, False, False, "130.00"),
    ("CA", "Cálcio total", "BIO", ST.SERUM, "SST", LM.COLORIMETRICO,
     "mg/dL", "8.5 - 10.5", Decimal("8.5"), Decimal("10.5"), Decimal("6.0"), Decimal("13.0"),
     4, False, False, "150.00"),
    ("MG", "Magnésio", "BIO", ST.SERUM, "SST", LM.COLORIMETRICO,
     "mg/dL", "1.7 - 2.2", Decimal("1.7"), Decimal("2.2"), None, None, 4, False, False, "150.00"),
    ("P", "Fósforo inorgânico", "BIO", ST.SERUM, "SST", LM.COLORIMETRICO,
     "mg/dL", "2.5 - 4.5", Decimal("2.5"), Decimal("4.5"), None, None, 4, False, False, "150.00"),
    ("BILT", "Bilirrubina total", "BIO", ST.SERUM, "SST", LM.DIAZOCOLORIMETRICO,
     "mg/dL", "0.3 - 1.2", Decimal("0.3"), Decimal("1.2"), None, Decimal("15.0"), 4, False, False, "160.00"),
    ("BILD", "Bilirrubina direta", "BIO", ST.SERUM, "SST", LM.DIAZOCOLORIMETRICO,
     "mg/dL", "0.0 - 0.3", Decimal("0.0"), Decimal("0.3"), None, None, 4, False, False, "160.00"),
    ("FA", "Fosfatase alcalina", "BIO", ST.SERUM, "SST", LM.CINETICOENZIMATICO,
     "U/L", "40 - 129", Decimal("40"), Decimal("129"), None, None, 4, False, False, "180.00"),
    ("GGT", "Gama-glutamiltransferase (GGT)", "BIO", ST.SERUM, "SST", LM.CINETICOENZIMATICO,
     "U/L", "8 - 61", Decimal("8"), Decimal("61"), None, None, 4, False, False, "180.00"),
    ("AMIL", "Amilase", "BIO", ST.SERUM, "SST", LM.CINETICOENZIMATICO,
     "U/L", "28 - 100", Decimal("28"), Decimal("100"), None, None, 4, False, False, "200.00"),
    ("LIP", "Lipase", "BIO", ST.SERUM, "SST", LM.ENZIMATICOCOLORIMETRICO,
     "U/L", "13 - 60", Decimal("13"), Decimal("60"), None, None, 4, False, False, "200.00"),
    ("LDH", "Desidrogenase láctica (LDH)", "BIO", ST.SERUM, "SST", LM.CINETICOENZIMATICO,
     "U/L", "125 - 220", Decimal("125"), Decimal("220"), None, None, 4, False, False, "200.00"),
    ("CK", "Creatina quinase total (CK)", "BIO", ST.SERUM, "SST", LM.CINETICOENZIMATICO,
     "U/L", "30 - 200", Decimal("30"), Decimal("200"), None, None, 4, False, False, "220.00"),
    ("CKMB", "CK-MB", "BIO", ST.SERUM, "SST", LM.IMUNOINIBICAO,
     "U/L", "0 - 25", Decimal("0"), Decimal("25"), None, Decimal("100"), 2, False, False, "280.00"),
    ("TROP", "Troponina I", "BIO", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "ng/mL", "< 0.04", None, Decimal("0.04"), None, Decimal("0.5"), 1, False, False, "450.00"),
    ("PTOT", "Proteínas totais", "BIO", ST.SERUM, "SST", LM.BIURETO,
     "g/dL", "6.4 - 8.3", Decimal("6.4"), Decimal("8.3"), None, None, 4, False, False, "150.00"),
    ("ALB", "Albumina", "BIO", ST.SERUM, "SST", LM.VERDEBROMOCRESOL,
     "g/dL", "3.5 - 5.0", Decimal("3.5"), Decimal("5.0"), None, None, 4, False, False, "150.00"),
    ("FERR", "Ferritina", "BIO", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "ng/mL", "30 - 300", Decimal("30"), Decimal("300"), None, None, 24, False, False, "350.00"),
    ("FE", "Ferro sérico", "BIO", ST.SERUM, "SST", LM.COLORIMETRICO,
     "µg/dL", "60 - 170", Decimal("60"), Decimal("170"), None, None, 4, True, False, "200.00"),

    # ── Serologia ────────────────────────────────────────────────────────
    ("HIV", "Teste rápido HIV", "SER", ST.WHOLE_BLOOD, None, LM.IMUNOCROMATOGRAFIA,
     "", "Não reagente", None, None, None, None, 1, False, True, "250.00"),
    ("HBSAG", "HBsAg (Hepatite B, antigénio de superfície)", "SER", ST.SERUM, "SST",
     LM.IMUNOCROMATOGRAFIA, "", "Não reagente", None, None, None, None, 4, False, True, "300.00"),
    ("HCV", "Anti-HCV (Hepatite C)", "SER", ST.SERUM, "SST", LM.IMUNOCROMATOGRAFIA,
     "", "Não reagente", None, None, None, None, 4, False, True, "300.00"),
    ("RPR", "RPR / VDRL (Sífilis)", "SER", ST.SERUM, "SST", LM.FLOCULACAO,
     "", "Não reagente", None, None, None, None, 2, False, False, "250.00"),
    ("WIDAL", "Widal (Febre tifóide)", "SER", ST.SERUM, "SST", LM.AGLUTINACAO,
     "", "< 1:80", None, None, None, None, 4, False, False, "250.00"),
    ("TOXO", "Toxoplasmose IgG/IgM", "SER", ST.SERUM, "SST", LM.ELISA,
     "", "IgG < 1.0 / IgM < 0.8 (não reagente)", None, None, None, None, 24, False, False, "350.00"),
    ("RUBOLA", "Rubéola IgG", "SER", ST.SERUM, "SST", LM.ELISA,
     "UI/mL", "Imune ≥ 10", Decimal("10"), None, None, None, 24, False, False, "350.00"),

    # ── Imunologia ───────────────────────────────────────────────────────
    ("CRP", "Proteína C-reativa (PCR)", "IMU", ST.SERUM, "SST", LM.IMUNOTURBIDIMETRIA,
     "mg/L", "< 6", None, Decimal("6"), None, None, 4, False, False, "250.00"),
    ("CD4", "Contagem de CD4", "IMU", ST.WHOLE_BLOOD, "EDTA-K3", LM.IMUNOENSAIO,
     "células/µL", "500 - 1500", Decimal("500"), Decimal("1500"), Decimal("200"), None,
     24, False, True, "600.00"),
    ("BHCG", "Beta-hCG quantitativo (gravidez)", "IMU", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "mUI/mL", "< 5 (não grávida)", None, Decimal("5"), None, None, 4, False, False, "250.00"),

    # ── Parasitologia ────────────────────────────────────────────────────
    ("MALG", "Pesquisa de plasmódio (gota espessa)", "PAR", ST.WHOLE_BLOOD, None, LM.GOTAESPESSA,
     "", "Negativo", None, None, None, None, 2, False, False, "120.00"),
    ("MRDT", "Teste rápido de malária", "PAR", ST.WHOLE_BLOOD, None, LM.IMUNOCROMATOGRAFIA,
     "", "Negativo", None, None, None, None, 1, False, False, "120.00"),
    ("EPF", "Exame parasitológico de fezes (EPF)", "PAR", ST.STOOL, "FEZES", LM.CONCENTRACAOFORMOLETER,
     "", "Sem parasitas", None, None, None, None, 24, False, False, "150.00"),
    ("SCHISTO", "Pesquisa de Schistosoma (urina)", "PAR", ST.URINE, "URINA-CITOL", LM.SEDIMENTACAO,
     "", "Negativo", None, None, None, None, 24, False, False, "150.00"),

    # ── Uroanálise ───────────────────────────────────────────────────────
    ("URINA2", "Urina II (sumária + sedimento)", "URI", ST.URINE, "URINA-EST",
     LM.FISICOQUIMICOMICROSCOPIA, "", "", None, None, None, None, 2, False, False, "150.00"),
    ("MICROALB", "Microalbuminúria (24h)", "URI", ST.URINE, "URINA-24H", LM.IMUNOTURBIDIMETRIA,
     "mg/24h", "< 30", None, Decimal("30"), None, None, 24, False, False, "300.00"),
    ("PROT24", "Proteinúria de 24 horas", "URI", ST.URINE, "URINA-24H", LM.COLORIMETRICO,
     "mg/24h", "< 150", None, Decimal("150"), None, None, 24, False, False, "280.00"),

    # ── Endocrinologia ───────────────────────────────────────────────────
    ("TSH", "TSH (hormona tirostimulante)", "END", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "µUI/mL", "0.4 - 4.0", Decimal("0.4"), Decimal("4.0"), Decimal("0.01"), Decimal("100"),
     24, False, False, "400.00"),
    ("T4L", "T4 livre", "END", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "ng/dL", "0.8 - 1.8", Decimal("0.8"), Decimal("1.8"), None, None, 24, False, False, "400.00"),
    ("T3", "Triiodotironina total (T3)", "END", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "ng/dL", "80 - 200", Decimal("80"), Decimal("200"), None, None, 24, False, False, "400.00"),
    ("PRL", "Prolactina", "END", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "ng/mL", "4.8 - 23.3", Decimal("4.8"), Decimal("23.3"), None, None, 24, False, False, "450.00"),
    ("CORT", "Cortisol (colheita 08h00)", "END", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "µg/dL", "6.2 - 19.4", Decimal("6.2"), Decimal("19.4"), None, None, 24, False, False, "450.00"),
    ("INS", "Insulina de jejum", "END", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "µUI/mL", "2.6 - 24.9", Decimal("2.6"), Decimal("24.9"), None, None, 24, True, False, "450.00"),
    ("PSA", "PSA total (antigénio prostático específico)", "END", ST.SERUM, "SST",
     LM.QUIMIOLUMINESCENCIA, "ng/mL", "< 4.0", None, Decimal("4.0"), None, None, 24, False, False, "450.00"),
    ("VITD", "Vitamina D (25-OH)", "END", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "ng/mL", "30 - 100", Decimal("30"), Decimal("100"), Decimal("10"), None, 48, False, False, "500.00"),
    ("VITB12", "Vitamina B12", "END", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "pg/mL", "200 - 900", Decimal("200"), Decimal("900"), None, None, 48, False, False, "450.00"),
    ("FOLATO", "Ácido fólico", "END", ST.SERUM, "SST", LM.QUIMIOLUMINESCENCIA,
     "ng/mL", "3.1 - 17.5", Decimal("3.1"), Decimal("17.5"), None, None, 48, False, False, "450.00"),

    # ── Microbiologia ────────────────────────────────────────────────────
    ("GRAM", "Coloração de Gram", "MIC", ST.OTHER, "SWAB-EST", LM.COLORACAOGRAM,
     "", "", None, None, None, None, 2, False, False, "100.00"),
    ("HEMOC", "Hemocultura", "MIC", ST.WHOLE_BLOOD, "HEMOC-AER", LM.CULTURA,
     "", "Sem crescimento", None, None, None, None, 120, False, False, "650.00"),
    ("UROC", "Urocultura", "MIC", ST.URINE, "URINA-EST", LM.CULTURAQUANTITATIVA,
     "UFC/mL", "< 10.000 (sem crescimento significativo)", None, None, None, None, 48, False, False, "500.00"),
    ("COPROC", "Coprocultura", "MIC", ST.STOOL, "FEZES", LM.CULTURASELETIVA,
     "", "Sem crescimento de patógenos", None, None, None, None, 72, False, False, "500.00"),
    ("CULTAB", "Cultura + antibiograma", "MIC", ST.OTHER, "SWAB-EST", LM.KIRBYBAUER,
     "", "Sem crescimento", None, None, None, None, 72, False, False, "700.00"),

    # ── Baciloscopia / Micobacteriologia ─────────────────────────────────
    ("BAAR", "Baciloscopia (pesquisa de BAAR)", "BAC", ST.SPUTUM, "ESCARRO", LM.COLORACAOZIEHL,
     "", "Negativo", None, None, None, None, 24, False, False, "150.00"),
    ("CULTB", "Cultura de micobactérias (TB)", "BAC", ST.SPUTUM, "ESCARRO-INO", LM.CULTURA,
     "", "Sem crescimento", None, None, None, None, 720, False, False, "800.00"),

    # ── Biologia Molecular ───────────────────────────────────────────────
    ("GENEXP", "GeneXpert MTB/RIF", "MOL", ST.SPUTUM, "ESCARRO", LM.PCRTEMPOREAL,
     "", "MTB não detetado", None, None, None, None, 4, False, False, "1200.00"),
    ("CVHIV", "Carga viral HIV", "MOL", ST.PLASMA, "EDTA-MOL", LM.PCRQUANTITATIVO,
     "cópias/mL", "< 50 (indetetável)", None, Decimal("50"), None, None, 72, False, True, "1500.00"),
    ("COVPCR", "PCR SARS-CoV-2 (COVID-19)", "MOL", ST.SWAB, "SWAB-PCR", LM.RTPCRQUALITATIVO,
     "", "Não detetado", None, None, None, None, 24, False, False, "1500.00"),
    ("HPVDNA", "HPV DNA", "MOL", ST.SWAB, "SWAB-EST", LM.HIBRIDIZACAOMOLECULAR,
     "", "Não detetado", None, None, None, None, 72, False, True, "1400.00"),

    # ── Toxicologia ──────────────────────────────────────────────────────
    ("ALCOOL", "Alcoolemia", "TOX", ST.WHOLE_BLOOD, "FLUORETO", LM.CROMOGENICO,
     "g/L", "0.0 (ausência)", None, Decimal("0.0"), None, Decimal("3.0"), 4, False, True, "300.00"),
    ("THC", "Pesquisa de canabinóides (urina)", "TOX", ST.URINE, "URINA-EST", LM.IMUNOCROMATOGRAFIA,
     "", "Negativo", None, None, None, None, 2, False, True, "250.00"),
    ("COTININA", "Cotinina (marcador de tabagismo)", "TOX", ST.URINE, "URINA-EST",
     LM.IMUNOCROMATOGRAFIA, "ng/mL", "Negativo (< 200)", None, Decimal("200"), None, None,
     4, False, False, "250.00"),
)

DU = DefaultUnit
NUM = LabTestField.ResultType.NUMERO
TXT = LabTestField.ResultType.TEXTO
CHOICE = LabTestField.ResultType.TEXTO_CHOICE

_CRUZES = ["Negativo", "Traços", "+", "++", "+++"]

# Analitos de exames multi-parâmetro (o exame "pai" não tem um único valor —
# cada analito tem a sua própria unidade/intervalo/limiar). Cada entrada:
# (test_code, [ (code, name, unit, result_type, reference_range, ref_low,
#                ref_high, crit_low, crit_high, result_choices), ... ])
FIELDS: tuple[tuple[str, tuple[tuple, ...]], ...] = (
    ("HEMOG", (
        ("RBC", "Eritrócitos (glóbulos vermelhos)", DU.X10_6_UL, NUM,
         "4.2 - 5.9", Decimal("4.2"), Decimal("5.9"), None, None, []),
        ("HGB", "Hemoglobina", DU.G_DL, NUM,
         "12.0 - 16.0", Decimal("12.0"), Decimal("16.0"), Decimal("7.0"), Decimal("20.0"), []),
        ("HCT", "Hematócrito", DU.PERCENT, NUM,
         "36 - 48", Decimal("36"), Decimal("48"), None, None, []),
        ("VGM", "VGM — Volume globular médio (MCV)", DU.FL, NUM,
         "80 - 100", Decimal("80"), Decimal("100"), None, None, []),
        ("HCM", "HCM — Hemoglobina corpuscular média (MCH)", DU.PG, NUM,
         "27 - 32", Decimal("27"), Decimal("32"), None, None, []),
        ("CHCM", "CHCM — Concentração de hemoglobina corpuscular média (MCHC)", DU.G_DL, NUM,
         "32 - 36", Decimal("32"), Decimal("36"), None, None, []),
        ("RDW", "RDW — Amplitude de distribuição eritrocitária", DU.PERCENT, NUM,
         "11.5 - 14.5", Decimal("11.5"), Decimal("14.5"), None, None, []),
        ("WBC", "Leucócitos (glóbulos brancos)", DU.X10_3_UL, NUM,
         "4.0 - 11.0", Decimal("4.0"), Decimal("11.0"), Decimal("1.0"), Decimal("30.0"), []),
        ("NEUT", "Neutrófilos", DU.PERCENT, NUM,
         "40 - 70", Decimal("40"), Decimal("70"), None, None, []),
        ("LINF", "Linfócitos", DU.PERCENT, NUM,
         "20 - 40", Decimal("20"), Decimal("40"), None, None, []),
        ("MONO", "Monócitos", DU.PERCENT, NUM,
         "2 - 8", Decimal("2"), Decimal("8"), None, None, []),
        ("EOSI", "Eosinófilos", DU.PERCENT, NUM,
         "1 - 4", Decimal("1"), Decimal("4"), None, None, []),
        ("BASO", "Basófilos", DU.PERCENT, NUM,
         "0 - 1", Decimal("0"), Decimal("1"), None, None, []),
        ("PLT", "Plaquetas", DU.X10_3_UL, NUM,
         "150 - 400", Decimal("150"), Decimal("400"), Decimal("20"), Decimal("1000"), []),
    )),
    ("URINA2", (
        ("COR", "Cor", DU.NO_UNIT, CHOICE, "Amarelo citrino", None, None, None, None,
         ["Amarelo citrino", "Amarelo", "Âmbar", "Incolor", "Avermelhada", "Acastanhada"]),
        ("ASPECTO", "Aspecto", DU.NO_UNIT, CHOICE, "Límpido", None, None, None, None,
         ["Límpido", "Ligeiramente turvo", "Turvo"]),
        ("DENS", "Densidade", DU.DENSIDADE, NUM,
         "1.005 - 1.030", Decimal("1.005"), Decimal("1.030"), None, None, []),
        ("PH", "pH", DU.PH, NUM,
         "5.0 - 8.0", Decimal("5.0"), Decimal("8.0"), None, None, []),
        ("PROT", "Proteínas", DU.CRUZES, CHOICE, "Negativo", None, None, None, None, list(_CRUZES)),
        ("GLIU", "Glicose", DU.CRUZES, CHOICE, "Negativo", None, None, None, None, list(_CRUZES)),
        ("CET", "Corpos cetónicos", DU.CRUZES, CHOICE, "Negativo", None, None, None, None, list(_CRUZES)),
        ("SANG", "Sangue oculto (hemoglobina)", DU.CRUZES, CHOICE, "Negativo", None, None, None, None,
         list(_CRUZES)),
        ("NITR", "Nitritos", DU.NO_UNIT, CHOICE, "Negativo", None, None, None, None,
         ["Negativo", "Positivo"]),
        ("LEUEST", "Esterase leucocitária", DU.CRUZES, CHOICE, "Negativo", None, None, None, None,
         list(_CRUZES)),
        ("HEMSED", "Hemácias (sedimento)", DU.CELULAS_CAMPO, NUM,
         "0 - 3", Decimal("0"), Decimal("3"), None, None, []),
        ("LEUSED", "Leucócitos (sedimento)", DU.CELULAS_CAMPO, NUM,
         "0 - 5", Decimal("0"), Decimal("5"), None, None, []),
        ("CEPIT", "Células epiteliais", DU.NO_UNIT, CHOICE, "Raras", None, None, None, None,
         ["Raras", "Algumas", "Numerosas"]),
        ("CILIN", "Cilindros", DU.NO_UNIT, CHOICE, "Ausentes", None, None, None, None,
         ["Ausentes", "Hialinos raros", "Granulosos"]),
        ("CRIST", "Cristais", DU.NO_UNIT, CHOICE, "Ausentes", None, None, None, None,
         ["Ausentes", "Oxalato de cálcio", "Urato amorfo", "Fosfato amorfo"]),
        ("BACT", "Bactérias", DU.NO_UNIT, CHOICE, "Ausentes", None, None, None, None,
         ["Ausentes", "Raras", "Presentes"]),
    )),
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


def _legacy_field_result_type(legacy_field) -> str:
    raw = str(getattr(legacy_field, "type", "") or "").strip().upper()
    if raw == "NUMERICO":
        return LabTestField.ResultType.NUMERO
    if raw in {"QUALITATIVO", "TEXTO"}:
        return LabTestField.ResultType.TEXTO
    if raw in {"ESCOLHA", "CHOICE", "TEXTO_CHOICE"}:
        return LabTestField.ResultType.TEXTO_CHOICE
    return LabTestField.ResultType.NUMERO


def _sync_legacy_test_fields(legacy_exam, lab_test) -> int:
    created = 0
    for index, legacy_field in enumerate(legacy_exam.campos.all().order_by("position", "id"), start=1):
        field_code = str(getattr(legacy_field, "custom_id", "") or "").strip()
        defaults = {
            "name": legacy_field.name,
            "code": field_code[:30] if field_code else "",
            "unit": getattr(legacy_field, "unit", "") or "",
            "result_type": _legacy_field_result_type(legacy_field),
            "result_choices": list(getattr(legacy_field, "result_choices", []) or []),
            "reference_range": getattr(legacy_field, "reference", None) or "",
            "reference_low": getattr(legacy_field, "reference_min", None),
            "reference_high": getattr(legacy_field, "reference_max", None),
            "critical_low": getattr(legacy_field, "critical_min", None),
            "critical_high": getattr(legacy_field, "critical_max", None),
            "sequence": getattr(legacy_field, "position", None) or index,
            "active": True,
        }
        lab_field = (
            LabTestField.objects.filter(tenant=lab_test.tenant, test=lab_test, code=defaults["code"]).first()
            if defaults["code"]
            else None
        )
        if not lab_field:
            lab_field = LabTestField.objects.filter(
                tenant=lab_test.tenant,
                test=lab_test,
                name__iexact=legacy_field.name,
            ).first()
        if lab_field:
            for key, value in defaults.items():
                setattr(lab_field, key, value)
            lab_field.save(update_fields=[*defaults.keys(), "updated_at"])
            continue
        LabTestField.objects.create(
            tenant=lab_test.tenant,
            test=lab_test,
            **defaults,
        )
        created += 1
    return created


def sync_legacy_lab_exams(tenant=None) -> dict:
    """Copia exames do catálogo legado ``clinical.LabExam`` para o LIS.

    O novo módulo de Laboratório Clínico usa ``LabTest``. Esta sincronização
    mantém o catálogo novo idempotente sem apagar nem mover os exames legados.
    """
    from apps.clinical.models.lab_exam import LabExam

    queryset = LabExam.objects.select_related("tenant", "sample_type").all()
    if tenant is not None:
        queryset = queryset.filter(tenant=tenant)

    stats = {"legacy_tests": 0, "legacy_skipped": 0, "legacy_sectors": 0, "legacy_fields": 0}
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
        custom_id = f"LTST-LEG-{legacy_exam.tenant_id}-{legacy_exam.id}"
        field_values = {
            "code": code,
            "name": legacy_exam.name,
            "sector": sector,
            "sample_type": _legacy_sample_type(getattr(legacy_exam, "sample_type", None)),
            "method": str(getattr(legacy_exam, "method", "") or "")[:120],
            "price": getattr(legacy_exam, "price", Decimal("0.00")) or Decimal("0.00"),
            "turnaround_hours": getattr(legacy_exam, "turnaround_hours", None) or 24,
            "requires_fasting": bool(getattr(getattr(legacy_exam, "sample_type", None), "fasting_required", False)),
            "active": True,
        }
        test = (
            LabTest.objects.filter(tenant=legacy_exam.tenant, code=code, deleted=False).first()
            or LabTest.objects.filter(tenant=legacy_exam.tenant, custom_id=custom_id, deleted=False).first()
            or LabTest.objects.filter(tenant=legacy_exam.tenant, name__iexact=legacy_exam.name, deleted=False).first()
        )
        if test is None:
            if LabTest.all_objects.filter(custom_id=custom_id).exists():
                custom_id = None
            test = LabTest.objects.create(
                tenant=legacy_exam.tenant,
                custom_id=custom_id,
                requires_consent=False,
                **field_values,
            )
            stats["legacy_tests"] += 1
        else:
            for key, value in field_values.items():
                setattr(test, key, value)
            test.save(update_fields=[*field_values.keys(), "updated_at"])
            stats["legacy_skipped"] += 1

        stats["legacy_fields"] += _sync_legacy_test_fields(legacy_exam, test)

    return stats


def _sync_panel_price(panel) -> None:
    """Preço do pacote = soma dos preços dos exames incluídos."""
    total = sum((test.price for test in panel.tests.all()), Decimal("0.00"))
    if panel.package_price != total:
        panel.package_price = total
        panel.save(update_fields=["package_price", "updated_at"])


_FIELD_ATTR_NAMES = (
    "name", "unit", "result_type", "reference_range", "reference_low",
    "reference_high", "critical_low", "critical_high", "result_choices", "sequence",
)


def _seed_test_fields(tenant, test: LabTest, specs: tuple[tuple, ...]) -> int:
    """Cria/atualiza os analitos (LabTestField) de um exame multi-parâmetro."""
    created = 0
    for sequence, (code, name, unit, result_type, ref, ref_low, ref_high,
                   crit_low, crit_high, choices) in enumerate(specs, start=1):
        field_values = {
            "name": name,
            "unit": unit,
            "result_type": result_type,
            "reference_range": ref,
            "reference_low": ref_low,
            "reference_high": ref_high,
            "critical_low": crit_low,
            "critical_high": crit_high,
            "result_choices": choices,
            "sequence": sequence,
        }
        field, was_created = LabTestField.objects.get_or_create(
            tenant=tenant, test=test, code=code, defaults=field_values,
        )
        if not was_created:
            for attr_name in _FIELD_ATTR_NAMES:
                setattr(field, attr_name, field_values[attr_name])
            field.save(update_fields=[*_FIELD_ATTR_NAMES, "updated_at"])
        created += int(was_created)
    return created


def _seed_containers(tenant, codes: set[str]) -> dict[str, LabContainerType]:
    """Cria (ou atualiza) apenas os tipos de recipiente referenciados pelos exames."""
    defs_by_code = {code: spec for code, *spec in CONTAINER_DEFS}
    containers: dict[str, LabContainerType] = {}
    for code in codes:
        spec = defs_by_code.get(code)
        if spec is None:
            continue
        (
            name, cap_color, additive, specimen_yields,
            volume_ml, inversions, conservation_temperature,
            conservation_max_hours, notes,
        ) = spec
        container, was_created = LabContainerType.objects.get_or_create(
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
            container.name = name
            container.cap_color = cap_color
            container.additive = additive
            container.specimen_yields = specimen_yields
            container.volume_ml = volume_ml
            container.inversions = inversions
            container.conservation_temperature = conservation_temperature
            container.conservation_max_hours = conservation_max_hours
            container.notes = notes
            container.save(update_fields=[
                "name", "cap_color", "additive", "specimen_yields",
                "volume_ml", "inversions", "conservation_temperature",
                "conservation_max_hours", "notes", "updated_at",
            ])
        containers[code] = container
    return containers


_TEST_FIELD_NAMES = (
    "name", "sector", "sample_type", "container_type", "method", "unit",
    "reference_range", "reference_low", "reference_high", "critical_low",
    "critical_high", "turnaround_hours", "requires_fasting", "requires_consent", "price",
)


def seed_catalog(tenant, *, include_legacy: bool = True) -> dict:
    """Cria/atualiza sectores, recipientes, exames e painéis padrão para um tenant.

    Idempotente: get_or_create por código; nas execuções seguintes os campos
    técnicos dos exames (método, tubo, limiares, TAT, jejum, preço) são
    sincronizados com o catálogo de referência, para que tenants semeados
    antes de um enriquecimento do catálogo fiquem atualizados ao re-executar.
    """
    sectors: dict[str, LabSector] = {}
    created = {"sectors": 0, "tests": 0, "panels": 0}

    for code, name in SECTORS:
        sector, was_created = LabSector.objects.get_or_create(
            tenant=tenant, code=code, defaults={"name": name})
        sectors[code] = sector
        created["sectors"] += int(was_created)

    container_codes = {row[4] for row in TESTS if row[4]}
    containers = _seed_containers(tenant, container_codes)

    tests: dict[str, LabTest] = {}
    for (
        code, name, sector_code, sample_type, container_code, method, unit, ref,
        ref_low, ref_high, crit_low, crit_high, turnaround_hours,
        requires_fasting, requires_consent, price,
    ) in TESTS:
        field_values = {
            "name": name,
            "sector": sectors[sector_code],
            "sample_type": sample_type,
            "container_type": containers.get(container_code) if container_code else None,
            "method": method,
            "unit": unit,
            "reference_range": ref,
            "reference_low": ref_low,
            "reference_high": ref_high,
            "critical_low": crit_low,
            "critical_high": crit_high,
            "turnaround_hours": turnaround_hours,
            "requires_fasting": requires_fasting,
            "requires_consent": requires_consent,
            "price": Decimal(price),
        }
        test, was_created = LabTest.objects.get_or_create(
            tenant=tenant, code=code, defaults=field_values,
        )
        if not was_created:
            for field_name in _TEST_FIELD_NAMES:
                setattr(test, field_name, field_values[field_name])
            test.save(update_fields=[*_TEST_FIELD_NAMES, "updated_at"])
        tests[code] = test
        created["tests"] += int(was_created)

    created["test_fields"] = 0
    for test_code, specs in FIELDS:
        test = tests.get(test_code)
        if test is None:
            continue
        created["test_fields"] += _seed_test_fields(tenant, test, specs)

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
            _sync_panel_price(panel)
        created["panels"] += int(was_created)

    created["occupational_profiles"] = 0
    for code, name, occupation, test_codes, price in OCCUPATIONAL_PROFILES:
        profile, was_created = LabTestPanel.objects.get_or_create(
            tenant=tenant, code=code,
            defaults={
                "name": name,
                "profile_type": LabTestPanel.ProfileType.OCCUPATIONAL,
                "occupation": occupation,
            },
        )
        if was_created:
            profile.tests.set([tests[c] for c in test_codes if c in tests])
            _sync_panel_price(profile)
        created["occupational_profiles"] += int(was_created)

    if include_legacy:
        created.update(sync_legacy_lab_exams(tenant))

    return created
