"""Seed incremental com mais 100 exames laboratoriais reais e seus parâmetros."""

from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.clinical.management.commands.seed_lab_exam_catalog import d
from apps.clinical.models import LabExam, LabExamField, Sample
from apps.tenants.models import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.sector import Sector
from core.constants.laboratory.units import DefaultUnit


EXTRA_EXAM_CATALOG = [
    ("EXC-101", "Apolipoproteína A1", "900.00", 6, Method.IMUNOTURBIDIMETRIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Apo A1", DefaultUnit.MG_DL, 110.0, 180.0, None, None),
    ]),
    ("EXC-102", "Apolipoproteína B", "900.00", 6, Method.IMUNOTURBIDIMETRIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Apo B", DefaultUnit.MG_DL, 55.0, 140.0, None, None),
    ]),
    ("EXC-103", "Lipoproteína(a)", "1200.00", 8, Method.IMUNOTURBIDIMETRIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Lp(a)", DefaultUnit.MG_DL, 0.0, 30.0, None, None),
    ]),
    ("EXC-104", "Homocisteína", "1300.00", 8, Method.ENZIMATICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Homocisteína", DefaultUnit.UMOL_L, 5.0, 15.0, None, 50.0),
    ]),
    ("EXC-105", "Lactato sérico", "700.00", 2, Method.ENZIMATICO_COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Lactato", DefaultUnit.MMOL_L, 0.5, 2.2, None, 8.0),
    ]),
    ("EXC-106", "Osmolalidade sérica", "850.00", 4, Method.COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Osmolalidade", DefaultUnit.MOSM_KG, 275.0, 295.0, None, 340.0),
    ]),
    ("EXC-107", "Bicarbonato total sérico", "450.00", 3, Method.ENZIMATICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("CO2 total", DefaultUnit.MEQ_L, 22.0, 29.0, 10.0, 40.0),
    ]),
    ("EXC-108", "Amónia plasmática", "900.00", 2, Method.ENZIMATICO, Sector.BIOQUIMICA, "AMO-MZ-003", [
        ("Amónia", DefaultUnit.UMOL_L, 11.0, 35.0, None, 150.0),
    ]),
    ("EXC-109", "Ceruloplasmina", "1100.00", 8, Method.NEFELOMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Ceruloplasmina", DefaultUnit.MG_DL, 20.0, 60.0, None, None),
    ]),
    ("EXC-110", "Haptoglobina", "1100.00", 8, Method.NEFELOMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Haptoglobina", DefaultUnit.MG_DL, 30.0, 200.0, None, None),
    ]),
    ("EXC-111", "Transferrina", "850.00", 6, Method.IMUNOTURBIDIMETRIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Transferrina", DefaultUnit.MG_DL, 200.0, 360.0, None, None),
    ]),
    ("EXC-112", "Pré-albumina", "850.00", 6, Method.IMUNOTURBIDIMETRIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Pré-albumina", DefaultUnit.MG_DL, 18.0, 45.0, None, None),
    ]),
    ("EXC-113", "Colinesterase sérica", "900.00", 6, Method.CINETICO_COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Colinesterase", DefaultUnit.U_L, 4000.0, 12000.0, None, None),
    ]),
    ("EXC-114", "CK-MB massa", "1000.00", 4, Method.ELETROQUIMIOLUMINESCENCIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("CK-MB", DefaultUnit.NG_ML, 0.0, 6.2, None, 100.0),
    ]),
    ("EXC-115", "Mioglobina sérica", "1000.00", 4, Method.ELETROQUIMIOLUMINESCENCIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Mioglobina", DefaultUnit.NG_ML, 0.0, 72.0, None, 1000.0),
    ]),
    ("EXC-116", "Urato urinário 24h", "700.00", 6, Method.ENZIMATICO_COLORIMETRICO, Sector.URINALISE, "AMO-MZ-004", [
        ("Ácido úrico urina 24h", DefaultUnit.MG_24H, 250.0, 750.0, None, None),
    ]),
    ("EXC-117", "Cloro urinário", "600.00", 4, Method.ELETRODO_ION_SELETIVO, Sector.URINALISE, "AMO-MZ-004", [
        ("Cloro urinário", DefaultUnit.MEQ_L, None, None, None, None),
    ]),
    ("EXC-118", "Sódio urinário", "600.00", 4, Method.ELETRODO_ION_SELETIVO, Sector.URINALISE, "AMO-MZ-004", [
        ("Sódio urinário", DefaultUnit.MEQ_L, None, None, None, None),
    ]),
    ("EXC-119", "Potássio urinário", "600.00", 4, Method.ELETRODO_ION_SELETIVO, Sector.URINALISE, "AMO-MZ-004", [
        ("Potássio urinário", DefaultUnit.MEQ_L, None, None, None, None),
    ]),
    ("EXC-120", "Clearance de creatinina", "900.00", 8, Method.JAFFE, Sector.URINALISE, "AMO-MZ-004", [
        ("Creatinina urina 24h", DefaultUnit.MG_24H, None, None, None, None),
        ("Clearance creatinina", DefaultUnit.ML_MIN, 90.0, 140.0, None, None),
    ]),
    ("EXC-121", "TSH receptor Ab (TRAb)", "1400.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
        ("TRAb", DefaultUnit.UI_L, 0.0, 1.75, None, None),
    ]),
    ("EXC-122", "Tiroglobulina", "1300.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
        ("Tiroglobulina", DefaultUnit.NG_ML, 1.4, 78.0, None, None),
    ]),
    ("EXC-123", "17-OH Progesterona", "1300.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
        ("17-OH Progesterona", DefaultUnit.NG_ML, 0.2, 2.7, None, None),
    ]),
    ("EXC-124", "DHEA-S", "1200.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
        ("DHEA-S", DefaultUnit.UG_DL, 35.0, 430.0, None, None),
    ]),
    ("EXC-125", "Androstenediona", "1300.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
        ("Androstenediona", DefaultUnit.NG_ML, 0.3, 3.3, None, None),
    ]),
    ("EXC-126", "SHBG", "1200.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
        ("SHBG", DefaultUnit.NMOL_L, 10.0, 57.0, None, None),
    ]),
    ("EXC-127", "Progesterona", "1100.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
        ("Progesterona", DefaultUnit.NG_ML, 0.1, 25.0, None, None),
    ]),
    ("EXC-128", "ACTH", "1500.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-003", [
        ("ACTH", DefaultUnit.PG_ML, 7.2, 63.3, None, None),
    ]),
    ("EXC-129", "Aldosterona", "1500.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
        ("Aldosterona", DefaultUnit.NG_DL, 4.0, 31.0, None, None),
    ]),
    ("EXC-130", "Renina directa", "1500.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.HORMONIOS, "AMO-MZ-002", [
        ("Renina directa", DefaultUnit.PG_ML, 4.4, 46.1, None, None),
    ]),
    ("EXC-131", "CEA", "1100.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
        ("CEA", DefaultUnit.NG_ML, 0.0, 5.0, None, 100.0),
    ]),
    ("EXC-132", "CA 19-9", "1300.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
        ("CA 19-9", DefaultUnit.U_ML, 0.0, 37.0, None, 1000.0),
    ]),
    ("EXC-133", "CA 15-3", "1300.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
        ("CA 15-3", DefaultUnit.U_ML, 0.0, 25.0, None, 500.0),
    ]),
    ("EXC-134", "CA 125", "1300.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
        ("CA 125", DefaultUnit.U_ML, 0.0, 35.0, None, 500.0),
    ]),
    ("EXC-135", "AFP", "1200.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
        ("AFP", DefaultUnit.NG_ML, 0.0, 10.0, None, 1000.0),
    ]),
    ("EXC-136", "Beta-2 microglobulina", "1300.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
        ("Beta-2 microglobulina", DefaultUnit.MG_L, 0.8, 2.2, None, 20.0),
    ]),
    ("EXC-137", "Calcitonina", "1400.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
        ("Calcitonina", DefaultUnit.PG_ML, 0.0, 11.5, None, 500.0),
    ]),
    ("EXC-138", "HE4", "1500.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
        ("HE4", DefaultUnit.PMOL_L, 0.0, 70.0, None, 1000.0),
    ]),
    ("EXC-139", "SCC Antigen", "1400.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
        ("SCC", DefaultUnit.NG_ML, 0.0, 2.0, None, 50.0),
    ]),
    ("EXC-140", "NSE", "1500.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.MARCADORES_TUMORAIS, "AMO-MZ-002", [
        ("NSE", DefaultUnit.NG_ML, 0.0, 16.3, None, 200.0),
    ]),
    ("EXC-141", "Chlamydia trachomatis IgG/IgM", "1100.00", 8, Method.ELISA, Sector.SEROLOGIA, "AMO-MZ-002", [
        ("Chlamydia IgG", DefaultUnit.U_L, None, None, None, None),
        ("Chlamydia IgM", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-142", "Mycoplasma pneumoniae IgG/IgM", "1100.00", 8, Method.ELISA, Sector.SEROLOGIA, "AMO-MZ-002", [
        ("Mycoplasma IgG", DefaultUnit.U_L, None, None, None, None),
        ("Mycoplasma IgM", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-143", "Helicobacter pylori IgG", "900.00", 6, Method.ELISA, Sector.SEROLOGIA, "AMO-MZ-002", [
        ("H. pylori IgG", DefaultUnit.U_ML, 0.0, 20.0, None, None),
    ]),
    ("EXC-144", "EBV VCA IgG/IgM", "1200.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.SEROLOGIA, "AMO-MZ-002", [
        ("EBV VCA IgG", DefaultUnit.U_ML, 0.0, 18.0, None, None),
        ("EBV VCA IgM", DefaultUnit.U_ML, 0.0, 36.0, None, None),
    ]),
    ("EXC-145", "HSV 1/2 IgG/IgM", "1200.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.SEROLOGIA, "AMO-MZ-002", [
        ("HSV IgG", DefaultUnit.U_L, None, None, None, None),
        ("HSV IgM", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-146", "Varicela-Zoster IgG/IgM", "1200.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.SEROLOGIA, "AMO-MZ-002", [
        ("VZV IgG", DefaultUnit.U_L, None, None, None, None),
        ("VZV IgM", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-147", "Sarampo IgG/IgM", "1100.00", 8, Method.ELISA, Sector.SEROLOGIA, "AMO-MZ-002", [
        ("Sarampo IgG", DefaultUnit.U_L, None, None, None, None),
        ("Sarampo IgM", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-148", "Caxumba IgG/IgM", "1100.00", 8, Method.ELISA, Sector.SEROLOGIA, "AMO-MZ-002", [
        ("Caxumba IgG", DefaultUnit.U_L, None, None, None, None),
        ("Caxumba IgM", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-149", "Febre tifóide (Widal)", "700.00", 4, Method.HEMAGLUTINACAO, Sector.SEROLOGIA, "AMO-MZ-002", [
        ("Salmonella O", DefaultUnit.U_L, None, None, None, None),
        ("Salmonella H", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-150", "Brucelose Rose Bengal", "800.00", 4, Method.AGLUTINACAO, Sector.SEROLOGIA, "AMO-MZ-002", [
        ("Brucella aglutinação", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-151", "C3d/C4d complemento", "1300.00", 8, Method.NEFELOMETRICO, Sector.IMUNOLOGIA, "AMO-MZ-002", [
        ("C3d", DefaultUnit.MG_DL, None, None, None, None),
        ("C4d", DefaultUnit.MG_DL, None, None, None, None),
    ]),
    ("EXC-152", "IgE total", "1200.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
        ("IgE total", DefaultUnit.UI_ML, 0.0, 100.0, None, 2000.0),
    ]),
    ("EXC-153", "Anti-dsDNA", "1400.00", 8, Method.ELISA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
        ("Anti-dsDNA", DefaultUnit.UI_ML, 0.0, 30.0, None, None),
    ]),
    ("EXC-154", "Anti-Sm", "1400.00", 8, Method.ELISA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
        ("Anti-Sm", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-155", "Anti-RNP", "1400.00", 8, Method.ELISA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
        ("Anti-RNP", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-156", "Anti-SSA (Ro)", "1400.00", 8, Method.ELISA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
        ("Anti-SSA", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-157", "Anti-SSB (La)", "1400.00", 8, Method.ELISA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
        ("Anti-SSB", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-158", "Anti-Scl-70", "1400.00", 8, Method.ELISA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
        ("Anti-Scl-70", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-159", "Anti-Jo1", "1400.00", 8, Method.ELISA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
        ("Anti-Jo1", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-160", "Anticardiolipina IgG/IgM", "1500.00", 8, Method.ELISA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
        ("ACL IgG", DefaultUnit.U_ML, 0.0, 20.0, None, None),
        ("ACL IgM", DefaultUnit.U_ML, 0.0, 20.0, None, None),
    ]),
    ("EXC-161", "Pesquisa de esquistossomose em urina", "500.00", 4, Method.MICROSCOPICO, Sector.PARASITOLOGIA, "AMO-MZ-004", [
        ("Ovos Schistosoma haematobium", DefaultUnit.OVOS_G, 0.0, 0.0, None, None),
    ]),
    ("EXC-162", "Strongyloides stercoralis pesquisa", "650.00", 6, Method.MICROSCOPICO, Sector.PARASITOLOGIA, "AMO-MZ-005", [
        ("Larvas de Strongyloides", DefaultUnit.CISTOS_CAMPO, 0.0, 0.0, None, None),
    ]),
    ("EXC-163", "Pesquisa de Cryptosporidium", "700.00", 6, Method.COLORACAO_ZIEHL, Sector.PARASITOLOGIA, "AMO-MZ-005", [
        ("Oocistos Cryptosporidium", DefaultUnit.CISTOS_CAMPO, 0.0, 0.0, None, None),
    ]),
    ("EXC-164", "Pesquisa de Giardia lamblia", "650.00", 6, Method.MICROSCOPICO, Sector.PARASITOLOGIA, "AMO-MZ-005", [
        ("Cistos Giardia", DefaultUnit.CISTOS_CAMPO, 0.0, 0.0, None, None),
    ]),
    ("EXC-165", "Pesquisa de Entamoeba histolytica", "650.00", 6, Method.MICROSCOPICO, Sector.PARASITOLOGIA, "AMO-MZ-005", [
        ("Cistos Entamoeba", DefaultUnit.CISTOS_CAMPO, 0.0, 0.0, None, None),
    ]),
    ("EXC-166", "Rotavírus antígeno fecal", "900.00", 4, Method.IMUNOCROMATOGRAFIA, Sector.PARASITOLOGIA, "AMO-MZ-005", [
        ("Rotavírus Ag", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-167", "Adenovírus fecal", "900.00", 4, Method.IMUNOCROMATOGRAFIA, Sector.PARASITOLOGIA, "AMO-MZ-005", [
        ("Adenovírus fecal", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-168", "Pesquisa de sangue oculto nas fezes", "450.00", 2, Method.IMUNOCROMATOGRAFIA, Sector.PARASITOLOGIA, "AMO-MZ-005", [
        ("Sangue oculto fecal", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-169", "Calprotectina fecal", "1500.00", 8, Method.ELISA, Sector.PARASITOLOGIA, "AMO-MZ-005", [
        ("Calprotectina fecal", DefaultUnit.UG_L, 0.0, 50.0, None, 500.0),
    ]),
    ("EXC-170", "Helicobacter pylori antígeno fecal", "1100.00", 6, Method.ELISA, Sector.PARASITOLOGIA, "AMO-MZ-005", [
        ("H. pylori Ag fecal", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-171", "Cultura de fezes", "900.00", 72, Method.CULTURA_AUTOMATIZADA, Sector.MICROBIOLOGIA, "AMO-MZ-005", [
        ("Salmonella/Shigella", DefaultUnit.U_L, None, None, None, None),
        ("Campylobacter", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-172", "Coprocultura + antibiograma", "1100.00", 72, Method.CULTURA_AUTOMATIZADA, Sector.MICROBIOLOGIA, "AMO-MZ-005", [
        ("Agente entérico isolado", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-173", "Cultura de ponta de cateter", "950.00", 72, Method.CULTURA_AUTOMATIZADA, Sector.MICROBIOLOGIA, "AMO-MZ-006", [
        ("Agente isolado", DefaultUnit.U_L, None, None, None, None),
        ("UFC/segmento", DefaultUnit.CELULAS_CAMPO, 0.0, None, None, None),
    ]),
    ("EXC-174", "Cultura de líquor", "1200.00", 72, Method.CULTURA_AUTOMATIZADA, Sector.MICROBIOLOGIA, "AMO-MZ-002", [
        ("Agente isolado", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-175", "Cultura de líquido pleural", "1200.00", 72, Method.CULTURA_AUTOMATIZADA, Sector.MICROBIOLOGIA, "AMO-MZ-002", [
        ("Agente isolado", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-176", "Cultura de líquido ascítico", "1200.00", 72, Method.CULTURA_AUTOMATIZADA, Sector.MICROBIOLOGIA, "AMO-MZ-002", [
        ("Agente isolado", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-177", "Pesquisa de Clostridioides difficile toxina", "1300.00", 6, Method.ELISA, Sector.MICROBIOLOGIA, "AMO-MZ-005", [
        ("Toxina A/B C. difficile", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-178", "Antígeno Streptococcus pneumoniae urinário", "1200.00", 4, Method.IMUNOCROMATOGRAFIA, Sector.MICROBIOLOGIA, "AMO-MZ-004", [
        ("Ag pneumococo", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-179", "Antígeno Legionella urinário", "1200.00", 4, Method.IMUNOCROMATOGRAFIA, Sector.MICROBIOLOGIA, "AMO-MZ-004", [
        ("Ag Legionella", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-180", "Pesquisa de fungos (KOH)", "500.00", 4, Method.MICROSCOPIA_OPTICA, Sector.MICROBIOLOGIA, "AMO-MZ-006", [
        ("Hifas/leveduras", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-181", "PCR Influenza A/B", "1800.00", 6, Method.RT_PCR, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-006", [
        ("Influenza A RNA", DefaultUnit.CT, None, None, None, None),
        ("Influenza B RNA", DefaultUnit.CT, None, None, None, None),
    ]),
    ("EXC-182", "PCR RSV", "1800.00", 6, Method.RT_PCR, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-006", [
        ("RSV RNA", DefaultUnit.CT, None, None, None, None),
    ]),
    ("EXC-183", "PCR Dengue", "2200.00", 8, Method.RT_PCR, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-002", [
        ("Dengue RNA", DefaultUnit.CT, None, None, None, None),
        ("Sorotipo", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-184", "PCR Chikungunya", "2200.00", 8, Method.RT_PCR, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-002", [
        ("Chikungunya RNA", DefaultUnit.CT, None, None, None, None),
    ]),
    ("EXC-185", "PCR Zika", "2200.00", 8, Method.RT_PCR, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-002", [
        ("Zika RNA", DefaultUnit.CT, None, None, None, None),
    ]),
    ("EXC-186", "PCR CMV quantitativo", "2800.00", 12, Method.PCR_QUANTITATIVO, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-002", [
        ("CMV DNA", DefaultUnit.UI_ML, 0.0, None, None, None),
        ("CMV log10", DefaultUnit.LOG10, 0.0, None, None, None),
    ]),
    ("EXC-187", "PCR EBV quantitativo", "2800.00", 12, Method.PCR_QUANTITATIVO, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-002", [
        ("EBV DNA", DefaultUnit.COPIAS_ML, 0.0, None, None, None),
        ("EBV log10", DefaultUnit.LOG10, 0.0, None, None, None),
    ]),
    ("EXC-188", "PCR HPV genotipagem", "3000.00", 24, Method.PCR_QUANTITATIVO, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-006", [
        ("HPV alto risco", DefaultUnit.U_L, None, None, None, None),
        ("Genótipo HPV", DefaultUnit.U_L, None, None, None, None),
    ]),
    ("EXC-189", "PCR Clamídia/Gonococo", "2600.00", 12, Method.NAAT, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-006", [
        ("Chlamydia trachomatis DNA", DefaultUnit.CT, None, None, None, None),
        ("Neisseria gonorrhoeae DNA", DefaultUnit.CT, None, None, None, None),
    ]),
    ("EXC-190", "PCR BK vírus", "2800.00", 12, Method.PCR_QUANTITATIVO, Sector.BIOLOGIA_MOLECULAR, "AMO-MZ-002", [
        ("BK vírus DNA", DefaultUnit.COPIAS_ML, 0.0, None, None, None),
    ]),
    ("EXC-191", "Electroforese de proteínas", "1200.00", 8, Method.ELETROFORESE, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Albumina %", DefaultUnit.PERCENT, 55.0, 66.0, None, None),
        ("Alfa-1 %", DefaultUnit.PERCENT, 2.0, 5.0, None, None),
        ("Alfa-2 %", DefaultUnit.PERCENT, 7.0, 13.0, None, None),
        ("Beta %", DefaultUnit.PERCENT, 8.0, 14.0, None, None),
        ("Gama %", DefaultUnit.PERCENT, 11.0, 22.0, None, None),
    ]),
    ("EXC-192", "Hemoglobina A2/F por HPLC", "1300.00", 8, Method.HPLC, Sector.HEMATOLOGIA, "AMO-MZ-001", [
        ("HbA2", DefaultUnit.PERCENT, 2.0, 3.5, None, None),
        ("HbF", DefaultUnit.PERCENT, 0.0, 1.0, None, None),
    ]),
    ("EXC-193", "Procalcitonina", "1400.00", 4, Method.ELETROQUIMIOLUMINESCENCIA, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Procalcitonina", DefaultUnit.NG_ML, 0.0, 0.1, None, 10.0),
    ]),
    ("EXC-194", "Interleucina-6", "1800.00", 8, Method.ELETROQUIMIOLUMINESCENCIA, Sector.IMUNOLOGIA, "AMO-MZ-002", [
        ("IL-6", DefaultUnit.PG_ML, 0.0, 7.0, None, 500.0),
    ]),
    ("EXC-195", "Osmolalidade urinária", "850.00", 4, Method.COLORIMETRICO, Sector.URINALISE, "AMO-MZ-004", [
        ("Osmolalidade urinária", DefaultUnit.MOSM_KG, 50.0, 1200.0, None, None),
    ]),
    ("EXC-196", "Metanefrinas urinárias fracionadas", "2200.00", 24, Method.HPLC, Sector.HORMONIOS, "AMO-MZ-004", [
        ("Metanefrina", DefaultUnit.UG_L, 0.0, 350.0, None, None),
        ("Normetanefrina", DefaultUnit.UG_L, 0.0, 600.0, None, None),
    ]),
    ("EXC-197", "Cobre sérico", "1100.00", 8, Method.COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Cobre", DefaultUnit.UG_DL, 70.0, 140.0, None, None),
    ]),
    ("EXC-198", "Zinco sérico", "1100.00", 8, Method.COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Zinco", DefaultUnit.UG_DL, 70.0, 120.0, None, None),
    ]),
    ("EXC-199", "Selénio sérico", "1300.00", 8, Method.COLORIMETRICO, Sector.BIOQUIMICA, "AMO-MZ-002", [
        ("Selénio", DefaultUnit.UG_L, 70.0, 150.0, None, None),
    ]),
    ("EXC-200", "Chumbo sanguíneo", "1500.00", 8, Method.COLORIMETRICO, Sector.TOXICOLOGIA, "AMO-MZ-001", [
        ("Chumbo", DefaultUnit.UG_DL, 0.0, 5.0, None, 45.0),
    ]),
]


class Command(BaseCommand):
    help = "Adiciona mais 100 exames laboratoriais reais ao catálogo, com campos completos."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", default=None, help="Slug ou ID do tenant (padrão: primeiro tenant).")
        parser.add_argument("--force", action="store_true", help="Recria exames extra já existentes.")

    def handle(self, *args, **options):
        tenant_arg = options["tenant"]
        force = options["force"]

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
                raise RuntimeError("Nenhum tenant encontrado.")

        sample_map = {s.custom_id: s for s in Sample.objects.filter(tenant=tenant) if s.custom_id}

        created_count = 0
        updated_count = 0
        skipped_count = 0

        with transaction.atomic():
            for cid, name, price, tat, method, sector, sample_cid, fields in EXTRA_EXAM_CATALOG:
                sample = sample_map.get(sample_cid)
                if not sample:
                    skipped_count += 1
                    self.stdout.write(self.style.WARNING(f"  ⚠ Amostra {sample_cid} não encontrada — exame '{name}' ignorado."))
                    continue

                existing = (
                    LabExam.objects.filter(tenant=tenant, custom_id=cid).first()
                    or LabExam.objects.filter(tenant=tenant, sector=sector, name=name).first()
                )
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
                else:
                    created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Concluído! Criados: {created_count} | Actualizados: {updated_count} | Ignorados: {skipped_count}"
        ))
