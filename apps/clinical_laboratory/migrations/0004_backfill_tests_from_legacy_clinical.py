# Generated manually to keep the LIS catalog aligned with the legacy clinical catalog.

from decimal import Decimal
import re
import unicodedata

from django.db import migrations


LEGACY_SECTOR_MAP = {
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


def ascii_key(value):
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    return "".join(ch for ch in normalized if not unicodedata.combining(ch)).casefold()


def legacy_sector(raw_sector):
    raw = str(raw_sector or "").strip() or "Outro"
    mapped = LEGACY_SECTOR_MAP.get(raw)
    if mapped:
        return mapped

    code = re.sub(r"[^A-Za-z0-9]+", "", raw.upper())[:12] or "OUT"
    return f"LEG{code}"[:20], raw


def legacy_sample_type(sample):
    name = ascii_key(getattr(sample, "name", ""))
    if "urina" in name:
        return "URINA"
    if "fez" in name or "fezes" in name:
        return "FEZES"
    if "escarro" in name:
        return "ESCARRO"
    if "liquor" in name or "lcr" in name:
        return "LCR"
    if "plasma" in name:
        return "PLASMA"
    if "swab" in name or "zaragatoa" in name or "secrecao" in name:
        return "ZARAGATOA"
    if "esperma" in name or "semen" in name:
        return "SEMEN"
    if "medula" in name:
        return "MEDULA"
    if "liquido" in name:
        return "LIQUIDO"
    if "sangue" in name:
        return "SANGUE_TOTAL"
    if "soro" in name:
        return "SORO"
    return "OUTRO"


def legacy_code(legacy_exam):
    custom_id = str(getattr(legacy_exam, "custom_id", "") or "").strip()
    if custom_id and len(custom_id) <= 30:
        return custom_id
    return f"LEG-{legacy_exam.pk}"


def copy_legacy_lab_exams(apps, schema_editor):
    LabExam = apps.get_model("clinical", "LabExam")
    LabSector = apps.get_model("laboratorio", "LabSector")
    LabTest = apps.get_model("laboratorio", "LabTest")

    queryset = LabExam.objects.select_related("tenant", "sample_type").filter(deleted=False)
    for legacy_exam in queryset.order_by("tenant_id", "sector", "name", "id"):
        if not legacy_exam.tenant_id or not (legacy_exam.name or "").strip():
            continue

        sector_code, sector_name = legacy_sector(getattr(legacy_exam, "sector", ""))
        sector = LabSector.objects.filter(
            tenant_id=legacy_exam.tenant_id,
            code=sector_code,
            deleted=False,
        ).first()
        if sector is None:
            sector = LabSector.objects.create(
                tenant_id=legacy_exam.tenant_id,
                code=sector_code,
                name=sector_name,
            )

        code = legacy_code(legacy_exam)
        if LabTest.objects.filter(tenant_id=legacy_exam.tenant_id, code=code, deleted=False).exists():
            continue
        if LabTest.objects.filter(tenant_id=legacy_exam.tenant_id, name__iexact=legacy_exam.name, deleted=False).exists():
            continue

        custom_id = f"LTST-LEG-{legacy_exam.tenant_id}-{legacy_exam.id}"
        if LabTest._base_manager.filter(custom_id=custom_id).exists():
            custom_id = None

        sample = getattr(legacy_exam, "sample_type", None)
        LabTest.objects.create(
            tenant_id=legacy_exam.tenant_id,
            custom_id=custom_id,
            code=code,
            name=legacy_exam.name,
            sector_id=sector.id,
            sample_type=legacy_sample_type(sample),
            method=str(getattr(legacy_exam, "method", "") or "")[:120],
            price=getattr(legacy_exam, "price", Decimal("0.00")) or Decimal("0.00"),
            turnaround_hours=getattr(legacy_exam, "turnaround_hours", None) or 24,
            requires_fasting=bool(getattr(sample, "fasting_required", False)),
            active=True,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("laboratorio", "0003_exposureincident_spillresponserecord_ppeitem_and_more"),
        ("clinical", "0007_alter_labexamfield_unit"),
    ]

    operations = [
        migrations.RunPython(copy_legacy_lab_exams, migrations.RunPython.noop),
    ]
