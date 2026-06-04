import infrastructure.orm.fields.email_field
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("clinical", "0005_resultitem_disregard_workflow"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="companion_name",
            field=models.CharField(
                blank=True,
                db_column="companion_name",
                default="",
                max_length=120,
                verbose_name="Nome do acompanhante",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="companion_relationship",
            field=models.CharField(
                blank=True,
                db_column="companion_relationship",
                default="",
                max_length=60,
                verbose_name="Parentesco do acompanhante",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="companion_contact",
            field=models.CharField(
                blank=True,
                db_column="companion_contact",
                default="",
                max_length=30,
                verbose_name="Contacto do acompanhante",
            ),
        ),
        migrations.AddField(
            model_name="patient",
            name="companion_email",
            field=infrastructure.orm.fields.email_field.NormalizedEmailField(
                blank=True,
                max_length=254,
                null=True,
                verbose_name="E-mail do acompanhante",
            ),
        ),
    ]
