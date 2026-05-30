from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("odontologia", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="dentalprocedure",
            name="code",
            field=models.CharField(
                blank=True,
                db_index=True,
                default="",
                editable=False,
                max_length=32,
                verbose_name="Código",
            ),
        ),
    ]
