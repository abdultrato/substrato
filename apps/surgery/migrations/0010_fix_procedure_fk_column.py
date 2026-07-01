# The through table was created with surgicalprocedure_id (Django default),
# not procedure_id as the through model declared. Fix Django state to match DB.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cirurgia', '0009_surgical_procedure_material_through'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterField(
                    model_name='surgicalprocedurematerial',
                    name='procedure',
                    field=models.ForeignKey(
                        db_column='surgicalprocedure_id',
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='material_entries',
                        to='cirurgia.surgicalprocedure',
                    ),
                ),
            ],
        ),
    ]
