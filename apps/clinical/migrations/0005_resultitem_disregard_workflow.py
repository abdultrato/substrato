from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

RESULT_STATE_CHOICES = [
    ("pendente", "Pendente"),
    ("em_analise", "Em Análise"),
    ("aguardando_validacao", "Aguardando Validação"),
    ("validado", "Validado"),
    ("rejeitado", "Rejeitado"),
    ("desconsiderado", "Desconsiderado"),
]


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("clinical", "0004_alter_labexam_turnaround_hours_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="resultitem",
            name="disregard_reason",
            field=models.TextField(blank=True, db_column="disregard_reason", verbose_name="Motivo da desconsideração"),
        ),
        migrations.AddField(
            model_name="resultitem",
            name="disregarded_at",
            field=models.DateTimeField(
                blank=True,
                db_column="disregarded_at",
                null=True,
                verbose_name="Data da desconsideração",
            ),
        ),
        migrations.AddField(
            model_name="resultitem",
            name="disregarded_by",
            field=models.ForeignKey(
                blank=True,
                db_column="disregarded_by_id",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="disregarded_results",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Desconsiderado por",
            ),
        ),
        migrations.AddField(
            model_name="resultitem",
            name="disregard_validated_by",
            field=models.ForeignKey(
                blank=True,
                db_column="disregard_validated_by_id",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="validated_result_disregards",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Desconsideração validada por",
            ),
        ),
        migrations.AddField(
            model_name="resultitem",
            name="disregard_validation_date",
            field=models.DateTimeField(
                blank=True,
                db_column="disregard_validation_date",
                null=True,
                verbose_name="Data de validação da desconsideração",
            ),
        ),
        migrations.AlterField(
            model_name="labrequest",
            name="status",
            field=models.CharField(
                choices=RESULT_STATE_CHOICES,
                db_column="status",
                db_index=True,
                default="pendente",
                max_length=30,
                verbose_name="Status da requisição",
            ),
        ),
        migrations.AlterField(
            model_name="resultitem",
            name="status",
            field=models.CharField(
                choices=RESULT_STATE_CHOICES,
                db_column="status",
                db_index=True,
                default="pendente",
                max_length=30,
                verbose_name="Status do resultado",
            ),
        ),
    ]
