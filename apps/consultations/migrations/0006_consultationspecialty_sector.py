from decimal import Decimal
import unicodedata

from django.db import migrations, models


SECTOR_CHOICES = [
    ("GENERAL_MEDICINE", "Clínica Geral"),
    ("CARDIOLOGY", "Cardiologia"),
    ("DERMATOLOGY", "Dermatologia"),
    ("ENDOCRINOLOGY", "Endocrinologia"),
    ("ANESTHESIOLOGY", "Anestesiologia"),
    ("PATHOLOGY", "Patologia"),
    ("NEUROLOGY", "Neurologia"),
    ("NUTRITION", "Nutrição"),
    ("OPHTHALMOLOGY", "Oftalmologia"),
    ("DENTISTRY", "Odontologia"),
    ("PHYSIOTHERAPY", "Fisioterapia"),
    ("OCCUPATIONAL_THERAPY", "Terapia Ocupacional"),
    ("GYNECOLOGY", "Ginecologia"),
    ("OBSTETRICS", "Obstetrícia"),
    ("NEPHROLOGY", "Nefrologia"),
    ("HEMATOLOGY", "Hematologia"),
    ("GASTROENTEROLOGY", "Gastroenterologia"),
    ("OTHER", "Outro"),
]

SPECIALTIES = [
    ("Clínica Geral", "GENERAL_MEDICINE"),
    ("Cardiologia", "CARDIOLOGY"),
    ("Dermatologia", "DERMATOLOGY"),
    ("Endocrinologia", "ENDOCRINOLOGY"),
    ("Anestesiologia", "ANESTHESIOLOGY"),
    ("Patologia", "PATHOLOGY"),
    ("Neurologia", "NEUROLOGY"),
    ("Nutrição", "NUTRITION"),
    ("Oftalmologia", "OPHTHALMOLOGY"),
    ("Odontologia", "DENTISTRY"),
    ("Fisioterapia", "PHYSIOTHERAPY"),
    ("Terapia Ocupacional", "OCCUPATIONAL_THERAPY"),
    ("Ginecologia", "GYNECOLOGY"),
    ("Obstetrícia", "OBSTETRICS"),
    ("Nefrologia", "NEPHROLOGY"),
    ("Hematologia", "HEMATOLOGY"),
    ("Gastroenterologia", "GASTROENTEROLOGY"),
]

ALIASES = {
    "clinica geral": "GENERAL_MEDICINE",
    "medicina geral": "GENERAL_MEDICINE",
    "medicina interna": "GENERAL_MEDICINE",
    "cardiologia": "CARDIOLOGY",
    "dermatologia": "DERMATOLOGY",
    "endocrinologia": "ENDOCRINOLOGY",
    "anestesiologia": "ANESTHESIOLOGY",
    "aanestesiologia": "ANESTHESIOLOGY",
    "patologia": "PATHOLOGY",
    "neurologia": "NEUROLOGY",
    "nutricao": "NUTRITION",
    "nutricao clinica": "NUTRITION",
    "oftalmologia": "OPHTHALMOLOGY",
    "odontologia": "DENTISTRY",
    "dentaria": "DENTISTRY",
    "fisioterapia": "PHYSIOTHERAPY",
    "terapia ocupacional": "OCCUPATIONAL_THERAPY",
    "ginecologia": "GYNECOLOGY",
    "ginecologia obstetricia": "GYNECOLOGY",
    "obstetricia": "OBSTETRICS",
    "nefrologia": "NEPHROLOGY",
    "nefrplogia": "NEPHROLOGY",
    "hematologia": "HEMATOLOGY",
    "gastroenterologia": "GASTROENTEROLOGY",
    "gstroenterologia": "GASTROENTEROLOGY",
}


def normalize(value):
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_text = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(ascii_text.lower().replace("-", " ").split())


def seed_sectors(apps, schema_editor):
    ConsultationSpecialty = apps.get_model("consultas", "ConsultationSpecialty")
    Tenant = apps.get_model("inquilinos", "Tenant")

    for specialty in ConsultationSpecialty.objects.all():
        sector = ALIASES.get(normalize(specialty.name), "OTHER")
        if specialty.sector != sector:
            specialty.sector = sector
            specialty.save(update_fields=["sector"])

    for tenant in Tenant.objects.all():
        for name, sector in SPECIALTIES:
            existing = ConsultationSpecialty.objects.filter(tenant=tenant, name__iexact=name).first()
            if existing:
                if existing.sector != sector:
                    existing.sector = sector
                    existing.save(update_fields=["sector"])
                continue
            ConsultationSpecialty.objects.create(
                tenant=tenant,
                name=name,
                description=f"Consulta de {name}.",
                base_price=Decimal("0.00"),
                vat_percentage=Decimal("16.00"),
                active=True,
                sector=sector,
            )


class Migration(migrations.Migration):

    dependencies = [
        ("consultas", "0005_medicalconsultation_reschedule_count"),
        ("inquilinos", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="consultationspecialty",
            name="sector",
            field=models.CharField(
                choices=SECTOR_CHOICES,
                db_column="sector",
                db_index=True,
                default="OTHER",
                help_text="Sector operacional onde consultas desta especialidade devem aparecer.",
                max_length=32,
                verbose_name="Sector clínico",
            ),
        ),
        migrations.AddIndex(
            model_name="consultationspecialty",
            index=models.Index(fields=["tenant", "sector", "active"], name="consultas_e_tenant__422928_idx"),
        ),
        migrations.RunPython(seed_sectors, migrations.RunPython.noop),
    ]
