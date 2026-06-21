from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinical", "0021_alter_labexamfield_unit"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="is_organ_donor",
            field=models.BooleanField(default=False, verbose_name="Doador de órgãos"),
        ),
    ]
