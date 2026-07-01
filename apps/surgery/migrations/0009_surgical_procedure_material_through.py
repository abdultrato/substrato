# Replaces the simple M2M table with a through model that carries quantity.
# The table cirurgia_procedimento_materiais already exists (created by 0008);
# we add the quantity column and re-register the M2M as a through field.

from django.db import migrations, models
import django.db.models.deletion


def add_quantity_column(apps, schema_editor):
    # SQLite doesn't support ADD COLUMN IF NOT EXISTS — check manually
    db = schema_editor.connection
    with db.cursor() as cursor:
        cursor.execute("PRAGMA table_info(cirurgia_procedimento_materiais)")
        cols = [row[1] for row in cursor.fetchall()]
        if "quantity" not in cols:
            cursor.execute(
                "ALTER TABLE cirurgia_procedimento_materiais "
                "ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1"
            )


class Migration(migrations.Migration):

    dependencies = [
        ('farmacia', '0004_materialrequisitionitem_product'),
        ('cirurgia', '0008_surgical_procedure_default_materials'),
    ]

    operations = [
        migrations.RunPython(add_quantity_column, migrations.RunPython.noop),
        # Register the through model in Django state only (table already exists)
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name='SurgicalProcedureMaterial',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('quantity', models.PositiveIntegerField(default=1, verbose_name='Quantidade')),
                        ('procedure', models.ForeignKey(db_column='surgicalprocedure_id', on_delete=django.db.models.deletion.CASCADE, related_name='material_entries', to='cirurgia.surgicalprocedure')),
                        ('product', models.ForeignKey(db_column='product_id', on_delete=django.db.models.deletion.CASCADE, related_name='cirurgia_procedimento_entries', to='farmacia.product')),
                    ],
                    options={
                        'db_table': 'cirurgia_procedimento_materiais',
                        'unique_together': {('procedure', 'product')},
                    },
                ),
                migrations.AlterField(
                    model_name='surgicalprocedure',
                    name='default_materials',
                    field=models.ManyToManyField(blank=True, related_name='cirurgia_procedimentos_padrao', through='cirurgia.SurgicalProcedureMaterial', to='farmacia.product', verbose_name='Materiais padrão'),
                ),
            ],
        ),
    ]
