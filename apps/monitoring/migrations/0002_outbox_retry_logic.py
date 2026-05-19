"""Migration para adicionar retry logic exponencial ao OutboxEvent"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('monitoramento', '0001_initial'),  # Ajuste conforme necessário
    ]

    operations = [
        migrations.AddField(
            model_name='transactionaloutboxevent',
            name='max_retries',
            field=models.PositiveIntegerField(
                default=5,
                verbose_name='Máximo de tentativas',
                help_text='Número máximo de tentativas antes de enviar para dead letter'
            ),
        ),
        migrations.AddField(
            model_name='transactionaloutboxevent',
            name='last_error_at',
            field=models.DateTimeField(
                null=True,
                blank=True,
                verbose_name='Último erro em',
                db_index=True
            ),
        ),
        migrations.AlterField(
            model_name='transactionaloutboxevent',
            name='idempotency_key',
            field=models.CharField(
                verbose_name='Chave de idempotência',
                max_length=140,
                blank=True,
                default='',
                unique=True,  # Adicionar constraint UNIQUE
            ),
        ),
    ]
