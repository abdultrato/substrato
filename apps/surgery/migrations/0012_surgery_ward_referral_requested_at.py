from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cirurgia", "0011_surgicalprocedure_surgery_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="surgery",
            name="ward_referral_requested_at",
            field=models.DateTimeField(
                blank=True,
                db_column="ward_referral_requested_at",
                db_index=True,
                null=True,
                verbose_name="Encaminhada para enfermaria em",
            ),
        ),
    ]
