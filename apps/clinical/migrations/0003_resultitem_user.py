from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("clinical", "0002_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="resultitem",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                db_column="user_id",
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="result_items",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Usuário",
            ),
        ),
    ]
