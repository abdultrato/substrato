from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cirurgia', '0010_fix_procedure_fk_column'),
    ]

    operations = [
        migrations.AddField(
            model_name='surgicalprocedure',
            name='surgery_type',
            field=models.CharField(
                choices=[('PEQUENA', 'Pequena cirurgia'), ('GRANDE', 'Grande cirurgia'), ('AMBAS', 'Ambas')],
                db_column='surgery_type',
                db_index=True,
                default='AMBAS',
                max_length=10,
                verbose_name='Tipo de cirurgia',
            ),
        ),
    ]
