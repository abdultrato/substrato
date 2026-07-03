"""
Converte BiologicalHazard.hazard_type de FK (HazardType) para CharField TextChoices.
Remove o modelo HazardType (tabela fica órfã mas não interfere).
"""

from django.db import migrations, models


def _fk_to_text(apps, schema_editor):
    BiologicalHazard = apps.get_model("laboratorio", "BiologicalHazard")
    HazardType = apps.get_model("laboratorio", "HazardType")

    mapping = {}
    for ht in HazardType.objects.all():
        n = ht.name.upper()
        if "VIRUS" in n or "VÍRUS" in n:
            mapping[ht.pk] = "VIRUS"
        elif "BACT" in n:
            mapping[ht.pk] = "BACTERIA"
        elif "FUNGO" in n or "FUNG" in n:
            mapping[ht.pk] = "FUNGO"
        elif "PARASIT" in n:
            mapping[ht.pk] = "PARASITA"
        elif "PRIÃO" in n or "PRION" in n or "PRÍON" in n:
            mapping[ht.pk] = "PRIAO"
        else:
            mapping[ht.pk] = "OUTRO"

    for hazard in BiologicalHazard.objects.filter(hazard_type__isnull=False):
        hazard.hazard_type_new = mapping.get(hazard.hazard_type_id, "OUTRO")
        hazard.save(update_fields=["hazard_type_new"])


def _text_to_fk(apps, schema_editor):
    pass  # reverse: best-effort, no FK data to restore


class Migration(migrations.Migration):

    dependencies = [
        ("laboratorio", "0016_hazard_type_fk"),
    ]

    operations = [
        # 1. Add temporary CharField alongside existing FK
        migrations.AddField(
            model_name="biologicalhazard",
            name="hazard_type_new",
            field=models.CharField(
                verbose_name="Tipo de perigo",
                max_length=10,
                blank=True,
                default="",
            ),
        ),
        # 2. Copy FK → text value
        migrations.RunPython(_fk_to_text, _text_to_fk),
        # 3. Remove old FK column
        migrations.RemoveField(model_name="biologicalhazard", name="hazard_type"),
        # 4. Rename temp column to canonical name
        migrations.RenameField(
            model_name="biologicalhazard",
            old_name="hazard_type_new",
            new_name="hazard_type",
        ),
        # 5. Delete HazardType model (table kept for safety, Django ignores orphan tables)
        migrations.DeleteModel(name="HazardType"),
    ]
