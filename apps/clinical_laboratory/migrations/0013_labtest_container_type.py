from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("laboratorio", "0012_alter_labtest_method"),
    ]

    operations = [
        migrations.AddField(
            model_name="labtest",
            name="container_type",
            field=models.CharField(
                blank=True,
                db_column="container_type",
                default="",
                max_length=80,
                verbose_name="Tipo de tubo/recipiente",
            ),
        ),
    ]
