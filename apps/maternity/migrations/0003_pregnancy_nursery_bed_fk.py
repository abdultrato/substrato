"""Converte Pregnancy.nursery/maternity_bed de texto livre para FK reais
(enfermagem.Ward / enfermagem.WardBed), preservando dados existentes via
get_or_create de Ward/WardBed a partir do texto legado.
"""

from django.db import migrations, models
import django.db.models.deletion


def migrate_text_to_fk(apps, schema_editor):
    Pregnancy = apps.get_model("maternidade", "Pregnancy")
    Ward = apps.get_model("enfermagem", "Ward")
    WardBed = apps.get_model("enfermagem", "WardBed")

    for pregnancy in Pregnancy.objects.exclude(nursery_legacy="").iterator():
        ward, _ = Ward.objects.get_or_create(
            tenant_id=pregnancy.tenant_id,
            name=pregnancy.nursery_legacy,
            defaults={"description": "Migrado automaticamente a partir de gestação (texto livre)."},
        )
        pregnancy.nursery_id = ward.id

        if pregnancy.maternity_bed_legacy:
            bed, _ = WardBed.objects.get_or_create(
                tenant_id=pregnancy.tenant_id,
                ward_id=ward.id,
                number=pregnancy.maternity_bed_legacy,
            )
            pregnancy.maternity_bed_id = bed.id

        pregnancy.save(update_fields=["nursery_id", "maternity_bed_id"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("maternidade", "0002_alter_pregnancy_maternity_bed"),
        ("enfermagem", "0007_alter_wardadmission_admission_date"),
    ]

    operations = [
        migrations.RenameField(model_name="pregnancy", old_name="nursery", new_name="nursery_legacy"),
        migrations.RenameField(model_name="pregnancy", old_name="maternity_bed", new_name="maternity_bed_legacy"),
        migrations.AlterField(
            model_name="pregnancy",
            name="nursery_legacy",
            field=models.CharField(blank=True, db_column="nursery_legacy_text", default="", max_length=80),
        ),
        migrations.AlterField(
            model_name="pregnancy",
            name="maternity_bed_legacy",
            field=models.CharField(blank=True, db_column="maternity_bed_legacy_text", default="", max_length=40),
        ),
        migrations.AddField(
            model_name="pregnancy",
            name="nursery",
            field=models.ForeignKey(
                blank=True,
                null=True,
                db_column="nursery_id",
                db_index=True,
                help_text="Enfermaria/berçário vinculado (quando aplicável).",
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="gestacoes_bercario",
                to="enfermagem.ward",
                verbose_name="Berçário",
            ),
        ),
        migrations.AddField(
            model_name="pregnancy",
            name="maternity_bed",
            field=models.ForeignKey(
                blank=True,
                null=True,
                db_column="maternity_bed_id",
                db_index=True,
                help_text="Cama vinculada (quando aplicável).",
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="gestacoes",
                to="enfermagem.wardbed",
                verbose_name="Cama na maternidade",
            ),
        ),
        migrations.RunPython(migrate_text_to_fk, noop_reverse),
        migrations.RemoveField(model_name="pregnancy", name="nursery_legacy"),
        migrations.RemoveField(model_name="pregnancy", name="maternity_bed_legacy"),
    ]
