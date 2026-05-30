from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("odontologia", "0002_dentalprocedure_auto_code"),
    ]

    operations = [
        migrations.AlterField(
            model_name="dentalodontogramentry",
            name="tooth_number",
            field=models.CharField(
                db_index=True,
                help_text="Use a numeração dentária FDI, como 11, 26, 48 ou 75.",
                max_length=4,
                verbose_name="Numeração dentária",
            ),
        ),
    ]
