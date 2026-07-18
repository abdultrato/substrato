"""Seed de 100 exames laboratoriais com analitos, valores de referência e críticos."""

from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.clinical.models import LabExam, LabExamField, Sample
from apps.tenants.models import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.sector import Sector
from core.constants.laboratory.units import DefaultUnit


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def d(v):
    return Decimal(str(v)) if v is not None else None


# ---------------------------------------------------------------------------
# Catálogo
# (custom_id, nome, preço, TAT_h, método, sector, amostra_custom_id, campos)
# campos = lista de (nome_analito, unidade, ref_min, ref_max, crit_min, crit_max)
# ---------------------------------------------------------------------------

EXAM_CATALOG = [
    # ── HEMATOLOGIA ─────────────────────────────────────────────────────────
    ("EXC-001", "Hemograma completo com diferencial", "700.00", 4,
     Method.HEMATOLOGIA_AUTOMATIZADA, Sector.HEMATOLOGIA, "AMO-MZ-001", [
         ("Hemoglobina",           DefaultUnit.G_DL,       12.0,  17.5,   7.0,  20.0),
         ("Hematócrito",           DefaultUnit.PERCENT,    36.0,  52.0,  20.0,  60.0),
         ("Eritrócitos",           DefaultUnit.X10_6_UL,    4.2,   5.8,   2.0,   7.0),
         ("Leucócitos",            DefaultUnit.X10_3_UL,    4.0,  11.0,   2.0,  30.0),
         ("Neutrófilos %",         DefaultUnit.PERCENT,    50.0,  70.0,  10.0,  90.0),
         ("Linfócitos %",          DefaultUnit.PERCENT,    20.0,  40.0,   5.0,  60.0),
         ("Monócitos %",           DefaultUnit.PERCENT,     2.0,   8.0,   0.0,  20.0),
         ("Eosinófilos %",         DefaultUnit.PERCENT,     1.0,   4.0,   0.0,  15.0),
         ("Basófilos %",           DefaultUnit.PERCENT,     0.0,   1.0,   0.0,   5.0),
         ("Plaquetas",             DefaultUnit.X10_3_UL,  150.0, 450.0,  50.0, 1000.0),
         ("VCM",                   DefaultUnit.FL,         80.0,  100.0,  None, None),
         ("HCM",                   DefaultUnit.PG,         27.0,   33.0,  None, None),
         ("CHCM",                  DefaultUnit.G_DL,       32.0,   36.0,  None, None),
         ("VHS",                   DefaultUnit.MM_H,        0.0,   15.0,  None,  None),
     ]),
    ("EXC-002", "Reticulócitos", "450.00", 4,
     Method.CITOMETRIA_FLUXO, Sector.HEMATOLOGIA, "AMO-MZ-001", [
         ("Reticulócitos %",       DefaultUnit.PERCENT,     0.5,   2.5,   0.0,   5.0),
         ("Reticulócitos abs",     DefaultUnit.X10_3_UL,   25.0, 125.0,   0.0, 200.0),
     ]),
    ("EXC-003", "Esfregaço de sangue periférico", "600.00", 8,
     Method.MICROSCOPIA_OPTICA, Sector.HEMATOLOGIA, "AMO-MZ-001", [
         ("Morfologia eritrocitária", DefaultUnit.PERCENT, None, None, None, None),
         ("Morfologia leucocitária",  DefaultUnit.PERCENT, None, None, None, None),
     ]),
    ("EXC-004", "Velocidade de hemossedimentação (VHS)", "300.00", 2,
     Method.SEDIMENTACAO, Sector.HEMATOLOGIA, "AMO-MZ-001", [
         ("VHS",                   DefaultUnit.MM_H,        0.0,  15.0,  None,  60.0),
     ]),

    # ── COAGULAÇÃO ──────────────────────────────────────────────────────────
    ("EXC-005", "Tempo de protrombina (TP/INR)", "550.00", 4,
     Method.COAGULOMETRIA, Sector.COAGULACAO, "AMO-MZ-003", [
         ("TP",                    DefaultUnit.G_DL,       11.0,  14.0,  None,  None),
         ("INR",                   DefaultUnit.G_DL,        0.8,   1.2,   0.5,   4.0),
         ("Actividade %",          DefaultUnit.PERCENT,    70.0, 120.0,  None,  None),
     ]),
    ("EXC-006", "Tempo de tromboplastina parcial activada (APTT)", "550.00", 4,
     Method.COAGULOMETRIA, Sector.COAGULACAO, "AMO-MZ-003", [
         ("APTT",                  DefaultUnit.G_DL,       25.0,  38.0,  None,  None),
         ("Rácio APTT",            DefaultUnit.G_DL,        0.8,   1.2,   None,  None),
     ]),
    ("EXC-007", "Fibrinogénio", "700.00", 4,
     Method.COAGULOMETRIA, Sector.COAGULACAO, "AMO-MZ-003", [
         ("Fibrinogénio",          DefaultUnit.MG_DL,     200.0, 400.0,  80.0, 700.0),
     ]),
    ("EXC-008", "D-dímeros", "950.00", 6,
     Method.IMUNOTURBIDIMETRIA, Sector.COAGULACAO, "AMO-MZ-003", [
         ("D-dímeros",             DefaultUnit.UG_ML,       0.0,   0.5,  None,   5.0),
     ]),

    # ── BIOQUÍMICA ──────────────────────────────────────────────────────────
    ("EXC-009", "Glicemia em jejum", "300.00", 2,
     Method.ENZIMATICO_COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Glicose",               DefaultUnit.MG_DL,      70.0,  99.0,  40.0, 500.0),
     ]),
    ("EXC-010", "Glicemia pós-prandial (2h)", "300.00", 3,
     Method.ENZIMATICO_COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Glicose 2h",            DefaultUnit.MG_DL,      70.0, 140.0,  40.0, 500.0),
     ]),
    ("EXC-011", "Hemoglobina glicada (HbA1c)", "850.00", 6,
     Method.HPLC, Sector.BIOQUIMICA, "AMO-MZ-001", [
         ("HbA1c",                 DefaultUnit.PERCENT,     4.0,   5.7,   None,  14.0),
     ]),
    ("EXC-012", "Perfil lipídico completo", "1050.00", 4,
     Method.ENZIMATICO_COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Colesterol total",      DefaultUnit.MG_DL,       0.0, 200.0,  None, 400.0),
         ("HDL colesterol",        DefaultUnit.MG_DL,      40.0,  None,  25.0,  None),
         ("LDL colesterol",        DefaultUnit.MG_DL,       0.0, 130.0,  None, 300.0),
         ("VLDL colesterol",       DefaultUnit.MG_DL,       0.0,  30.0,  None, 100.0),
         ("Triglicéridos",         DefaultUnit.MG_DL,       0.0, 150.0,  None, 500.0),
         ("Colesterol não-HDL",    DefaultUnit.MG_DL,       0.0, 160.0,  None,  None),
     ]),
    ("EXC-013", "Creatinina sérica", "350.00", 3,
     Method.JAFFE, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Creatinina",            DefaultUnit.MG_DL,       0.6,   1.3,   0.2,  10.0),
     ]),
    ("EXC-014", "Ureia", "350.00", 3,
     Method.ENZIMATICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Ureia",                 DefaultUnit.MG_DL,      15.0,  45.0,   5.0, 200.0),
     ]),
    ("EXC-015", "Ácido úrico", "400.00", 3,
     Method.ENZIMATICO_COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Ácido úrico (♂)",       DefaultUnit.MG_DL,       3.5,   7.2,   None,  12.0),
         ("Ácido úrico (♀)",       DefaultUnit.MG_DL,       2.6,   6.0,   None,  10.0),
     ]),
    ("EXC-016", "TGO / AST", "450.00", 3,
     Method.CINETICO_UV, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("AST",                   DefaultUnit.U_L,          0.0,  40.0,  None, 1000.0),
     ]),
    ("EXC-017", "TGP / ALT", "450.00", 3,
     Method.CINETICO_UV, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("ALT",                   DefaultUnit.U_L,          0.0,  41.0,  None, 1000.0),
     ]),
    ("EXC-018", "Gama GT (GGT)", "450.00", 3,
     Method.CINETICO_COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("GGT (♂)",               DefaultUnit.U_L,          8.0,  61.0,  None,  500.0),
         ("GGT (♀)",               DefaultUnit.U_L,          5.0,  36.0,  None,  500.0),
     ]),
    ("EXC-019", "Fosfatase alcalina (FA)", "450.00", 3,
     Method.CINETICO_COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("FA (adulto)",           DefaultUnit.U_L,         44.0, 147.0,  None, 1000.0),
     ]),
    ("EXC-020", "Bilirrubinas totais e fracções", "550.00", 3,
     Method.DIAZO_COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Bilirrubina total",     DefaultUnit.MG_DL,        0.0,   1.2,   0.0,  15.0),
         ("Bilirrubina directa",   DefaultUnit.MG_DL,        0.0,   0.3,   0.0,   5.0),
         ("Bilirrubina indirecta", DefaultUnit.MG_DL,        0.0,   0.9,   0.0,  10.0),
     ]),
    ("EXC-021", "Proteínas totais e albumina", "550.00", 3,
     Method.BIURETO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Proteínas totais",      DefaultUnit.G_DL,         6.4,   8.3,   3.0,  12.0),
         ("Albumina",              DefaultUnit.G_DL,         3.5,   5.0,   1.5,   7.0),
     ]),
    ("EXC-022", "Ionograma sérico", "750.00", 4,
     Method.ELETRODO_ION_SELETIVO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Sódio",                 DefaultUnit.MEQ_L,      136.0, 145.0, 120.0, 160.0),
         ("Potássio",              DefaultUnit.MEQ_L,        3.5,   5.0,   2.5,   6.5),
         ("Cloro",                 DefaultUnit.MEQ_L,       98.0, 107.0,  80.0, 120.0),
         ("Bicarbonato",           DefaultUnit.MEQ_L,       22.0,  29.0,  10.0,  40.0),
     ]),
    ("EXC-023", "Cálcio sérico", "450.00", 3,
     Method.COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Cálcio total",          DefaultUnit.MG_DL,        8.5,  10.2,   6.0,  13.0),
     ]),
    ("EXC-024", "Fósforo sérico", "400.00", 3,
     Method.COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Fósforo",               DefaultUnit.MG_DL,        2.5,   4.5,   1.0,   8.0),
     ]),
    ("EXC-025", "Magnésio sérico", "450.00", 3,
     Method.COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Magnésio",              DefaultUnit.MG_DL,        1.7,   2.2,   1.0,   4.0),
     ]),
    ("EXC-026", "Lactato desidrogenase (LDH)", "500.00", 3,
     Method.CINETICO_UV, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("LDH",                   DefaultUnit.U_L,        125.0, 220.0,  None, 1000.0),
     ]),
    ("EXC-027", "Creatina cinase (CK total)", "550.00", 3,
     Method.CINETICO_UV, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("CK total (♂)",          DefaultUnit.U_L,         39.0, 308.0,  None, 2000.0),
         ("CK total (♀)",          DefaultUnit.U_L,         26.0, 192.0,  None, 2000.0),
     ]),
    ("EXC-028", "Troponina I (TnI)", "1200.00", 2,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Troponina I",           DefaultUnit.NG_ML,        0.0,  0.04,  None,   2.0),
     ]),
    ("EXC-029", "BNP / NT-proBNP", "1500.00", 4,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("NT-proBNP",             DefaultUnit.PG_ML,        0.0, 125.0,  None, 5000.0),
     ]),
    ("EXC-030", "Proteína C reactiva (PCR)", "700.00", 3,
     Method.IMUNOTURBIDIMETRIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("PCR",                   DefaultUnit.MG_L,         0.0,   5.0,  None,  100.0),
     ]),
    ("EXC-031", "Amilase sérica", "500.00", 3,
     Method.ENZIMATICO_COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Amilase",               DefaultUnit.U_L,         28.0, 100.0,  None,  500.0),
     ]),
    ("EXC-032", "Lipase sérica", "550.00", 3,
     Method.ENZIMATICO_COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Lipase",                DefaultUnit.U_L,         13.0,  60.0,  None,  300.0),
     ]),
    ("EXC-033", "Ferritina sérica", "950.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Ferritina (♂)",         DefaultUnit.NG_ML,       30.0, 400.0,   5.0, 1500.0),
         ("Ferritina (♀)",         DefaultUnit.NG_ML,       13.0, 150.0,   5.0, 1500.0),
     ]),
    ("EXC-034", "Ferro sérico e TIBC", "750.00", 4,
     Method.COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Ferro sérico",          DefaultUnit.UG_DL,       65.0, 175.0,  20.0, 400.0),
         ("TIBC",                  DefaultUnit.UG_DL,      250.0, 370.0,  None,  None),
         ("Saturação transf.",     DefaultUnit.PERCENT,     20.0,  50.0,   None,  None),
     ]),
    ("EXC-035", "Vitamina B12", "1000.00", 8,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Vitamina B12",          DefaultUnit.PG_ML,      211.0, 911.0,  None,  None),
     ]),
    ("EXC-036", "Folato sérico", "900.00", 8,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
         ("Folato sérico",         DefaultUnit.NG_ML,        5.4,  None,   2.0,  None),
     ]),

    # ── IMUNOLOGIA / SEROLOGIA ───────────────────────────────────────────────
    ("EXC-037", "HIV Ag/Ac combo (4ª geração)", "850.00", 3,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
         ("HIV Ag/Ac",             DefaultUnit.U_L,         None, None, None, None),
     ]),
    ("EXC-038", "Hepatite B — AgHBs", "700.00", 4,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.SEROLOGIA, "AMO-MZ-002", [
         ("AgHBs",                 DefaultUnit.U_L,         None, None, None, None),
     ]),
    ("EXC-039", "Hepatite B — Anti-HBs", "750.00", 4,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.SEROLOGIA, "AMO-MZ-002", [
         ("Anti-HBs",              DefaultUnit.UI_ML,        0.0,  None,  None,  None),
     ]),
    ("EXC-040", "Hepatite B — HBeAg", "800.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.SEROLOGIA, "AMO-MZ-002", [
         ("HBeAg",                 DefaultUnit.U_L,         None, None, None, None),
     ]),
    ("EXC-041", "Hepatite C — Anti-VHC", "750.00", 4,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.SEROLOGIA, "AMO-MZ-002", [
         ("Anti-VHC",              DefaultUnit.U_L,         None, None, None, None),
     ]),
    ("EXC-042", "Sífilis (TPHA + VDRL)", "650.00", 4,
     Method.HEMAGLUTINACAO, Sector.SEROLOGIA, "AMO-MZ-002", [
         ("TPHA",                  DefaultUnit.U_L,         None, None, None, None),
         ("VDRL",                  DefaultUnit.U_L,         None, None, None, None),
     ]),
    ("EXC-043", "Toxoplasmose IgG/IgM", "900.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.SEROLOGIA, "AMO-MZ-002", [
         ("Toxo IgG",              DefaultUnit.UI_ML,        0.0,   3.0, None, None),
         ("Toxo IgM",              DefaultUnit.UI_ML,        0.0,  0.55, None, None),
     ]),
    ("EXC-044", "Rubéola IgG/IgM", "900.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.SEROLOGIA, "AMO-MZ-002", [
         ("Rubéola IgG",           DefaultUnit.UI_ML,        0.0,   9.9, None, None),
         ("Rubéola IgM",           DefaultUnit.UI_ML,        0.0,   0.9, None, None),
     ]),
    ("EXC-045", "CMV IgG/IgM", "900.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.SEROLOGIA, "AMO-MZ-002", [
         ("CMV IgG",               DefaultUnit.U_L,          0.0,   0.5, None, None),
         ("CMV IgM",               DefaultUnit.U_L,          0.0,   0.5, None, None),
     ]),
    ("EXC-046", "Dengue NS1 + IgM/IgG", "1100.00", 4,
     Method.IMUNOCROMATOGRAFIA, Sector.SEROLOGIA, "AMO-MZ-002", [
         ("NS1 dengue",            DefaultUnit.U_L,         None, None, None, None),
         ("IgM dengue",            DefaultUnit.U_L,         None, None, None, None),
     ]),
    ("EXC-047", "Leptospirose IgM (MAT/ELISA)", "1000.00", 8,
     Method.ELISA, Sector.SEROLOGIA, "AMO-MZ-002", [
         ("Leptospirose IgM",      DefaultUnit.U_L,         None, None, None, None),
     ]),

    # ── HORMONOLOGIA ────────────────────────────────────────────────────────
    ("EXC-048", "TSH ultrassensível", "900.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("TSH",                   DefaultUnit.MUI_L,       0.35,  4.94,  0.1,  20.0),
     ]),
    ("EXC-049", "T4 livre (FT4)", "900.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("FT4",                   DefaultUnit.NG_DL,       0.70,  1.48, None,  None),
     ]),
    ("EXC-050", "T3 livre (FT3)", "900.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("FT3",                   DefaultUnit.PG_ML,       2.30,  4.20, None,  None),
     ]),
    ("EXC-051", "Anti-TPO e Anti-TG", "1200.00", 8,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("Anti-TPO",              DefaultUnit.UI_ML,        0.0,  34.0, None,  None),
         ("Anti-TG",               DefaultUnit.UI_ML,        0.0, 115.0, None,  None),
     ]),
    ("EXC-052", "Beta-HCG quantitativo", "850.00", 4,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("Beta-HCG",              DefaultUnit.MUI_L,        0.0,   5.0, None,  None),
     ]),
    ("EXC-053", "Cortisol basal", "1000.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("Cortisol (8h)",         DefaultUnit.UG_DL,        6.7,  22.6, None,  None),
     ]),
    ("EXC-054", "Prolactina", "900.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("Prolactina (♂)",        DefaultUnit.NG_ML,        2.0,  18.0, None,  None),
         ("Prolactina (♀)",        DefaultUnit.NG_ML,        2.0,  29.0, None,  None),
     ]),
    ("EXC-055", "Testosterona total", "950.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("Testosterona (♂)",      DefaultUnit.NG_ML,        2.49,  8.36, 0.5,  None),
         ("Testosterona (♀)",      DefaultUnit.NG_ML,        0.08,  0.60, None,  None),
     ]),
    ("EXC-056", "FSH / LH", "1000.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("FSH",                   DefaultUnit.MUI_L,        1.7,  21.5, None,  None),
         ("LH",                    DefaultUnit.MUI_L,        1.1,  11.6, None,  None),
     ]),
    ("EXC-057", "Estradiol (E2)", "950.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("Estradiol",             DefaultUnit.PG_ML,       46.0, 607.0, None,  None),
     ]),
    ("EXC-058", "Insulina de jejum", "1100.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("Insulina",              DefaultUnit.MUI_L,        2.6,  24.9, None,  None),
         ("HOMA-IR (calculado)",   DefaultUnit.G_DL,         0.0,   2.9, None,   7.0),
     ]),
    ("EXC-059", "PTH intacta", "1300.00", 8,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("PTH intacta",           DefaultUnit.PG_ML,       15.0,  65.0, None,  None),
     ]),
    ("EXC-060", "Vitamina D (25-OH)", "1200.00", 8,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
         ("25-OH Vitamina D",      DefaultUnit.NG_ML,       30.0, 100.0, None,  None),
     ]),

    # ── MARCADORES TUMORAIS ─────────────────────────────────────────────────
    ("EXC-061", "PSA total", "1000.00", 6,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
         ("PSA total",             DefaultUnit.NG_ML,        0.0,   4.0, None,  None),
     ]),
    ("EXC-062", "PSA livre / total", "1300.00", 8,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
         ("PSA livre",             DefaultUnit.NG_ML,        0.0,   None, None,  None),
         ("Rácio PSA livre/total", DefaultUnit.PERCENT,     25.0,  None, None,  None),
     ]),
    ("EXC-063", "AFP (alfa-fetoproteína)", "1100.00", 8,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
         ("AFP",                   DefaultUnit.NG_ML,        0.0,   7.0, None,  None),
     ]),
    ("EXC-064", "CEA", "1100.00", 8,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
         ("CEA",                   DefaultUnit.NG_ML,        0.0,   5.0, None,  None),
     ]),
    ("EXC-065", "CA 125", "1200.00", 8,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
         ("CA 125",                DefaultUnit.U_ML,         0.0,  35.0, None,  None),
     ]),
    ("EXC-066", "CA 19-9", "1200.00", 8,
     Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
         ("CA 19-9",               DefaultUnit.U_ML,         0.0,  37.0, None,  None),
     ]),

    # ── MICROBIOLOGIA ────────────────────────────────────────────────────────
    ("EXC-067", "Urocultura + antibiograma", "900.00", 48,
     Method.CULTURA_AUTOMATIZADA, Sector.MICROBIOLOGIA, "AMO-MZ-004", [
         ("Agente isolado",        DefaultUnit.G_DL,        None, None, None, None),
         ("Contagem UFC/mL",       DefaultUnit.CELULAS_CAMPO, 0.0, None, None, None),
     ]),
    ("EXC-068", "Hemocultura (set de 2 frascos)", "1500.00", 120,
     Method.CULTURA_AUTOMATIZADA, Sector.MICROBIOLOGIA, "AMO-MZ-001", [
         ("Agente isolado",        DefaultUnit.G_DL,        None, None, None, None),
         ("Perfil sensibilidade",  DefaultUnit.G_DL,        None, None, None, None),
     ]),
    ("EXC-069", "Cultura de secreção + antibiograma", "950.00", 72,
     Method.CULTURA_AUTOMATIZADA, Sector.MICROBIOLOGIA, "AMO-MZ-006", [
         ("Agente isolado",        DefaultUnit.G_DL,        None, None, None, None),
     ]),
    ("EXC-070", "Baciloscopia (Ziehl-Neelsen)", "600.00", 24,
     Method.COLORACAO_ZIEHL, Sector.MICROBIOLOGIA, "AMO-MZ-007", [
         ("BAAR",                  DefaultUnit.G_DL,        None, None, None, None),
     ]),
    ("EXC-071", "Cultura para BAAR (TB)", "1200.00", 720,
     Method.CULTURA_AUTOMATIZADA, Sector.MICROBIOLOGIA, "AMO-MZ-007", [
         ("Crescimento BAAR",      DefaultUnit.G_DL,        None, None, None, None),
     ]),
    ("EXC-072", "Exame directo de secreção (Gram)", "500.00", 4,
     Method.COLORACAO_GRAM, Sector.MICROBIOLOGIA, "AMO-MZ-006", [
         ("Morfologia bacteriana",  DefaultUnit.G_DL,       None, None, None, None),
     ]),

    # ── PARASITOLOGIA ────────────────────────────────────────────────────────
    ("EXC-073", "Malária — gota espessa + esfregaço", "550.00", 2,
     Method.GOTA_ESPESSA, Sector.PARASITOLOGIA, "AMO-MZ-008", [
         ("Plasmodium sp.",        DefaultUnit.PARASITAS_UL,  0.0, 0.0, None, None),
         ("Espécie identificada",  DefaultUnit.G_DL,         None, None, None, None),
         ("Densidade parasitária", DefaultUnit.PARASITAS_UL,  0.0, None, None, None),
     ]),
    ("EXC-074", "Malária — RDT (TDR)", "400.00", 1,
     Method.IMUNOCROMATOGRAFIA, Sector.PARASITOLOGIA, "AMO-MZ-001", [
         ("Plasmodium falciparum", DefaultUnit.G_DL,         None, None, None, None),
         ("Pan-Plasmodium",        DefaultUnit.G_DL,         None, None, None, None),
     ]),
    ("EXC-075", "Exame coprológico directo", "450.00", 4,
     Method.MICROSCOPICO, Sector.PARASITOLOGIA, "AMO-MZ-005", [
         ("Ovos de helmintas",     DefaultUnit.OVOS_G,       0.0,  0.0, None, None),
         ("Cistos de protozoários",DefaultUnit.CISTOS_CAMPO, 0.0,  0.0, None, None),
     ]),
    ("EXC-076", "Kato-Katz (helmintas quantitativo)", "550.00", 4,
     Method.KATO_KATZ, Sector.PARASITOLOGIA, "AMO-MZ-005", [
         ("Ovos / grama fezes",    DefaultUnit.OVOS_G,       0.0,  0.0, None, None),
     ]),
    ("EXC-077", "Concentração Formol-Éter (Ritchie)", "550.00", 4,
     Method.CONCENTRACAO_FORMOL_ETER, Sector.PARASITOLOGIA, "AMO-MZ-005", [
         ("Cistos / oocistos",     DefaultUnit.CISTOS_CAMPO, 0.0,  0.0, None, None),
         ("Ovos de helmintas",     DefaultUnit.OVOS_G,       0.0,  0.0, None, None),
     ]),

    # ── URINÁLISE ───────────────────────────────────────────────────────────
    ("EXC-078", "Urina II (EAS completo)", "500.00", 2,
     Method.FISICO_QUIMICO_MICROSCOPIA, Sector.URINALISE, "AMO-MZ-004", [
         ("pH urinário",           DefaultUnit.PH,           5.0,   8.0, None, None),
         ("Densidade",             DefaultUnit.DENSIDADE,    1.003, 1.03, None, None),
         ("Proteínas",             DefaultUnit.MG_DL,        0.0,  14.0, None,  300.0),
         ("Glicose",               DefaultUnit.MG_DL,        0.0,  15.0, None,  None),
         ("Leucócitos/campo",      DefaultUnit.CELULAS_CAMPO, 0.0,  5.0, None,   50.0),
         ("Eritrócitos/campo",     DefaultUnit.CELULAS_CAMPO, 0.0,  3.0, None,   20.0),
         ("Nitritos",              DefaultUnit.G_DL,         None, None, None, None),
         ("Corpos cetónicos",      DefaultUnit.MG_DL,        0.0,   0.0, None,  None),
         ("Bilirrubina",           DefaultUnit.G_DL,         None, None, None, None),
     ]),
    ("EXC-079", "Microalbuminúria (urina 24h)", "750.00", 4,
     Method.IMUNOTURBIDIMETRIA, Sector.URINALISE, "AMO-MZ-004", [
         ("Microalbumina urina",   DefaultUnit.MG_24H,       0.0,  30.0, None,  300.0),
         ("Creatinina urina",      DefaultUnit.MG_DL,       None,  None, None,  None),
         ("Rácio Alb/Creat",       DefaultUnit.MG_DL,        0.0,  30.0, None,  None),
     ]),
    ("EXC-080", "Proteinúria de 24h", "700.00", 4,
     Method.COLORIMETRICO, Sector.URINALISE, "AMO-MZ-004", [
         ("Proteinúria 24h",       DefaultUnit.MG_24H,       0.0, 150.0, None,  None),
         ("Volume urina 24h",      DefaultUnit.MG_DL,       None,  None, None,  None),
     ]),

    # ── BIOLOGIA MOLECULAR ───────────────────────────────────────────────────
    ("EXC-081", "PCR SARS-CoV-2 (RT-PCR)", "2000.00", 6,
     Method.RT_PCR, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-006", [
         ("SARS-CoV-2 RNA",        DefaultUnit.CT,          None, None, None, None),
         ("Gene E",                DefaultUnit.CT,          None, None, None, None),
         ("Gene RdRp",             DefaultUnit.CT,          None, None, None, None),
     ]),
    ("EXC-082", "Carga viral HIV-1 (RNA)", "3500.00", 24,
     Method.RT_PCR_QUANTITATIVO, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-002", [
         ("HIV-1 RNA",             DefaultUnit.COPIAS_ML,    0.0,  None, None, None),
         ("HIV-1 log10",           DefaultUnit.LOG10,        0.0,  None, None, None),
     ]),
    ("EXC-083", "Carga viral VHB (DNA)", "3500.00", 24,
     Method.PCR_QUANTITATIVO, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-002", [
         ("VHB DNA",               DefaultUnit.UI_ML,        0.0,  None, None, None),
         ("VHB log10",             DefaultUnit.LOG10,        0.0,  None, None, None),
     ]),
    ("EXC-084", "Carga viral VHC (RNA)", "3500.00", 24,
     Method.RT_PCR_QUANTITATIVO, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-002", [
         ("VHC RNA",               DefaultUnit.UI_ML,        0.0,  None, None, None),
         ("Genótipo VHC",          DefaultUnit.G_DL,         None, None, None, None),
     ]),
    ("EXC-085", "GeneXpert MTB/RIF", "2500.00", 2,
     Method.NAAT, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-007", [
         ("MTB detectado",         DefaultUnit.G_DL,         None, None, None, None),
         ("Resistência RIF",       DefaultUnit.G_DL,         None, None, None, None),
     ]),
    ("EXC-086", "Resistência ARVs (genotipagem)", "8000.00", 72,
     Method.SEQUENCIAMENTO, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-002", [
         ("Mutações NRTI",         DefaultUnit.G_DL,         None, None, None, None),
         ("Mutações NNRTI",        DefaultUnit.G_DL,         None, None, None, None),
         ("Mutações PI",           DefaultUnit.G_DL,         None, None, None, None),
     ]),
    ("EXC-087", "PCR Malária (P. falciparum quantitativo)", "2500.00", 8,
     Method.PCR_QUANTITATIVO, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-001", [
         ("P. falciparum DNA",     DefaultUnit.COPIAS_ML,    0.0,   0.0, None, None),
     ]),

    # ── IMUNOLOGIA CLÍNICA ───────────────────────────────────────────────────
    ("EXC-088", "Contagem CD4 / CD8", "2500.00", 8,
     Method.CITOMETRIA_FLUXO, Sector.IMUNOLOGIA, "AMO-MZ-001", [
         ("CD4 abs",               DefaultUnit.CEL_MM3,    500.0, 1500.0, 200.0, None),
         ("CD8 abs",               DefaultUnit.CEL_MM3,    180.0,  900.0, None, None),
         ("CD4/CD8",               DefaultUnit.G_DL,         1.0,    3.0, 0.5, None),
         ("CD4 %",                 DefaultUnit.PERCENT,     28.0,   58.0, 14.0, None),
     ]),
    ("EXC-089", "ANA (anticorpos antinucleares)", "1200.00", 12,
     Method.IMUNOFLUORESCENCIA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
         ("ANA (título)",          DefaultUnit.U_L,          0.0,   None, None, None),
         ("Padrão fluorescência",  DefaultUnit.G_DL,         None,  None, None, None),
     ]),
    ("EXC-090", "ANCA (anti-neutrofílico)", "1400.00", 12,
     Method.IMUNOFLUORESCENCIA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
         ("c-ANCA",                DefaultUnit.U_L,          0.0,   None, None, None),
         ("p-ANCA",                DefaultUnit.U_L,          0.0,   None, None, None),
     ]),
    ("EXC-091", "Factor reumatóide (FR)", "700.00", 6,
     Method.NEFELOMETRICO, Sector.IMUNOLOGIA, "AMO-MZ-002", [
         ("FR (IgM)",              DefaultUnit.UI_ML,        0.0,  20.0, None,  None),
     ]),
    ("EXC-092", "Anti-CCP (anti-péptido citrulinado)", "1400.00", 8,
     Method.ELISA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
         ("Anti-CCP",              DefaultUnit.U_ML,         0.0,  17.0, None,  None),
     ]),
    ("EXC-093", "Complemento C3 e C4", "1100.00", 8,
     Method.NEFELOMETRICO, Sector.IMUNOLOGIA, "AMO-MZ-002", [
         ("C3",                    DefaultUnit.MG_DL,       90.0, 180.0, None,  None),
         ("C4",                    DefaultUnit.MG_DL,       16.0,  47.0, None,  None),
     ]),
    ("EXC-094", "Imunoglobulinas IgG/IgA/IgM", "1200.00", 8,
     Method.NEFELOMETRICO, Sector.IMUNOLOGIA, "AMO-MZ-002", [
         ("IgG",                   DefaultUnit.MG_DL,      700.0, 1600.0, None,  None),
         ("IgA",                   DefaultUnit.MG_DL,       70.0,  400.0, None,  None),
         ("IgM",                   DefaultUnit.MG_DL,       40.0,  230.0, None,  None),
     ]),

    # ── GASOMETRIA / LÍQUIDOS CORPORAIS ─────────────────────────────────────
    ("EXC-095", "Gasometria arterial (ABG)", "1500.00", 1,
     Method.ELETRODO_ION_SELETIVO, Sector.GASOMETRIA, "AMO-MZ-001", [
         ("pH arterial",           DefaultUnit.PH,           7.35,  7.45,  7.20,  7.60),
         ("pCO2",                  DefaultUnit.MG_DL,       35.0,  45.0,  20.0,  70.0),
         ("pO2",                   DefaultUnit.MG_DL,       80.0, 100.0,  50.0, None),
         ("HCO3",                  DefaultUnit.MEQ_L,       22.0,  26.0,  10.0,  40.0),
         ("SatO2 %",               DefaultUnit.PERCENT,     95.0, 100.0,  75.0, None),
         ("BE",                    DefaultUnit.MEQ_L,        -2.0,   2.0,  -10.0,  10.0),
     ]),
    ("EXC-096", "Análise de líquido cefalorraquidiano (LCR)", "1200.00", 4,
     Method.FISICO_QUIMICO_MICROSCOPIA, Sector.LIQUIDOS_CORPORAIS, "AMO-MZ-002", [
         ("Proteínas LCR",         DefaultUnit.MG_DL,       15.0,  45.0,  None,  None),
         ("Glicose LCR",           DefaultUnit.MG_DL,       45.0,  80.0,  20.0,  None),
         ("Leucócitos LCR",        DefaultUnit.CEL_MM3,      0.0,   5.0,  None,  None),
         ("Eritrócitos LCR",       DefaultUnit.CEL_MM3,      0.0,   0.0,  None,  None),
     ]),
    ("EXC-097", "Análise de líquido pleural", "1000.00", 4,
     Method.FISICO_QUIMICO_MICROSCOPIA, Sector.LIQUIDOS_CORPORAIS, "AMO-MZ-002", [
         ("Proteínas pleural",     DefaultUnit.G_DL,         None,  None,  None,  None),
         ("LDH pleural",           DefaultUnit.U_L,          None,  None,  None,  None),
         ("Leucócitos pleural",    DefaultUnit.CEL_MM3,      None,  None,  None,  None),
         ("Glicose pleural",       DefaultUnit.MG_DL,        None,  None,  None,  None),
     ]),

    # ── TOXICOLOGIA ─────────────────────────────────────────────────────────
    ("EXC-098", "Drogas de abuso (painel 10 parâmetros)", "1800.00", 4,
     Method.IMUNOENSAIO, Sector.TOXICOLOGIA, "AMO-MZ-004", [
         ("THC (cannabis)",        DefaultUnit.NG_ML,        0.0,  50.0, None,  None),
         ("Cocaína (benzoilecgonina)", DefaultUnit.NG_ML,    0.0, 300.0, None,  None),
         ("Opiáceos",              DefaultUnit.NG_ML,        0.0, 300.0, None,  None),
         ("Anfetaminas",           DefaultUnit.NG_ML,        0.0, 500.0, None,  None),
         ("Benzodiazepinas",       DefaultUnit.NG_ML,        0.0, 200.0, None,  None),
     ]),
    ("EXC-099", "Paracetamol e salicilatos (toxicológico)", "1000.00", 2,
     Method.ENZIMATICO_COLORIMETRICO, Sector.TOXICOLOGIA, "AMO-MZ-002", [
         ("Paracetamol",           DefaultUnit.UG_ML,        0.0,  20.0, None, 150.0),
         ("Salicilatos",           DefaultUnit.MG_DL,        0.0,   2.0, None,  30.0),
     ]),
    ("EXC-100", "Etanol sérico (alcoolemia)", "700.00", 2,
     Method.ENZIMATICO_COLORIMETRICO, Sector.TOXICOLOGIA, "AMO-MZ-002", [
         ("Etanol sérico",         DefaultUnit.MG_DL,        0.0,   0.0, None,  80.0),
     ]),
]


# ---------------------------------------------------------------------------
# Command
# ---------------------------------------------------------------------------

class Command(BaseCommand):
    help = "Seed de 100 exames laboratoriais com analitos, valores de referência e críticos."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", default=None, help="Slug ou ID do tenant (padrão: primeiro tenant).")
        parser.add_argument("--force", action="store_true", help="Recria exames já existentes (apaga e recria).")

    def handle(self, *args, **options):
        tenant_arg = options["tenant"]
        force = options["force"]

        # ── Tenant ──────────────────────────────────────────────────────────
        if tenant_arg:
            try:
                tenant = Tenant.objects.get(pk=int(tenant_arg))
            except (Tenant.DoesNotExist, ValueError):
                tenant = Tenant.objects.filter(name__iexact=tenant_arg).first()
                if not tenant:
                    raise RuntimeError(f"Tenant '{tenant_arg}' não encontrado.")
        else:
            tenant = Tenant.objects.order_by("id").first()
            if not tenant:
                raise RuntimeError("Nenhum tenant encontrado. Crie um tenant antes de executar este seed.")

        self.stdout.write(f"Tenant: {tenant} (id={tenant.id})")

        # ── Amostras (reutiliza as criadas pelo seed clínico) ────────────────
        sample_map: dict[str, Sample] = {}
        for s in Sample.objects.filter(tenant=tenant):
            if s.custom_id:
                sample_map[s.custom_id] = s

        # Se não existirem amostras, cria amostras mínimas necessárias
        SAMPLE_FALLBACKS = [
            ("AMO-MZ-001", "Sangue total EDTA",   Sample.BottleType.EDTA_TUBE,      "roxa",        "2.00",  False, 0,  "2-8 C", "EDTA"),
            ("AMO-MZ-002", "Soro",                Sample.BottleType.DRY_TUBE,       "vermelha",    "3.00",  True,  8,  "2-8 C", ""),
            ("AMO-MZ-003", "Plasma citratado",    Sample.BottleType.CITRATE_TUBE,   "azul",        "1.80",  False, 0,  "2-8 C", "Citrato"),
            ("AMO-MZ-004", "Urina jato médio",    Sample.BottleType.URINE_CONTAINER,"transparente","10.00", False, 0,  "ambiente", ""),
            ("AMO-MZ-005", "Fezes",               Sample.BottleType.STOOL_CONTAINER,"transparente","5.00",  False, 0,  "ambiente", ""),
            ("AMO-MZ-006", "Swab nasofaríngeo",   Sample.BottleType.STERILE_CONTAINER,"esteril",  "1.00",  False, 0,  "2-8 C", ""),
            ("AMO-MZ-007", "Escarro/expectoração",Sample.BottleType.STERILE_CONTAINER,"esteril",  "2.00",  False, 0,  "2-8 C", ""),
            ("AMO-MZ-008", "Gota espessa",        Sample.BottleType.OTHER,          "lâmina",     "0.10",  False, 0,  "ambiente", ""),
        ]
        for cid, name, bt, cap, vol, fast, fh, temp, anti in SAMPLE_FALLBACKS:
            if cid not in sample_map:
                s, created = Sample.objects.get_or_create(
                    tenant=tenant, custom_id=cid,
                    defaults=dict(
                        name=name, bottle_type=bt, cap_color=cap,
                        minimum_volume_ml=Decimal(vol),
                        fasting_required=fast, fasting_hours=fh,
                        storage_temperature=temp, anticoagulant=anti,
                        stability_hours=48,
                    ),
                )
                sample_map[cid] = s
                if created:
                    self.stdout.write(f"  [+] Amostra criada: {name}")

        # ── Exames ──────────────────────────────────────────────────────────
        created_count = 0
        updated_count = 0
        skipped_count = 0

        with transaction.atomic():
            for (cid, name, price, tat, method, sector, sample_cid, fields) in EXAM_CATALOG:
                sample = sample_map.get(sample_cid)
                if not sample:
                    self.stdout.write(self.style.WARNING(f"  ⚠ Amostra {sample_cid} não encontrada — exame '{name}' ignorado."))
                    skipped_count += 1
                    continue

                existing = LabExam.objects.filter(tenant=tenant, custom_id=cid).first()

                if existing and not force:
                    skipped_count += 1
                    continue

                if existing and force:
                    existing.campos.all().delete()
                    existing.delete()

                exam = LabExam.objects.create(
                    tenant=tenant,
                    custom_id=cid,
                    name=name,
                    price=Decimal(price),
                    vat_percentage=Decimal("5.00"),
                    applies_vat_by_default=True,
                    turnaround_hours=tat,
                    method=method,
                    sector=sector,
                    sample_type=sample,
                )

                for pos, (fname, unit, ref_min, ref_max, crit_min, crit_max) in enumerate(fields, start=1):
                    LabExamField.objects.create(
                        tenant=tenant,
                        exam=exam,
                        name=fname,
                        type=ResultType.NUMERICO if ref_min is not None or ref_max is not None else ResultType.QUALITATIVO,
                        unit=unit,
                        reference_min=d(ref_min),
                        reference_max=d(ref_max),
                        critical_min=d(crit_min),
                        critical_max=d(crit_max),
                        position=pos,
                    )

                if existing:
                    updated_count += 1
                    self.stdout.write(f"  [~] Exame actualizado: {name} ({cid})")
                else:
                    created_count += 1
                    self.stdout.write(f"  [+] Exame criado: {name} ({cid})")

        self.stdout.write(self.style.SUCCESS(
            f"\nConcluído! Criados: {created_count} | Actualizados: {updated_count} | Ignorados: {skipped_count}"
        ))
