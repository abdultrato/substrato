from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cirurgia", "0014_remove_operatingroom_equipment_notes_and_more"),
        ("farmacia", "0005_lot_status_lot_status_reason_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="surgicalprocedure",
            name="is_surgical",
            field=models.BooleanField(
                db_column="is_surgical",
                db_index=True,
                default=True,
                verbose_name="Procedimento cirúrgico",
            ),
        ),
        migrations.AlterField(
            model_name="surgicalprocedure",
            name="default_materials",
            field=models.ManyToManyField(
                blank=True,
                related_name="cirurgia_procedimentos_padrao",
                through="cirurgia.SurgicalProcedureMaterial",
                through_fields=("procedure", "product"),
                to="farmacia.product",
                verbose_name="Materiais padrão",
            ),
        ),
    ]
