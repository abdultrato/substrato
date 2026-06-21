from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("clinical", "0024_lab_medical_exam_unique_per_tenant"),
    ]

    operations = [
        migrations.AlterField(
            model_name="labrequestitem",
            name="sample_status",
            field=models.CharField(
                choices=[
                    ("aguardando", "Aguardando receção"),
                    ("coletada", "Amostra coletada"),
                    ("recebida", "Amostra recebida"),
                    ("rejeitada", "Amostra rejeitada"),
                ],
                db_column="sample_status",
                db_index=True,
                default="aguardando",
                max_length=20,
                verbose_name="Estado da amostra",
            ),
        ),
    ]
