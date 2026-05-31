from django.contrib.auth.hashers import identify_hasher, make_password
from django.db import migrations, models


def _is_hashed(value):
    if not value:
        return False
    try:
        identify_hasher(value)
    except ValueError:
        return False
    return True


def hash_existing_password_reset_tokens(apps, schema_editor):
    PasswordResetToken = apps.get_model("identidade", "PasswordResetToken")
    for reset_token in PasswordResetToken.objects.exclude(token="").iterator():
        if _is_hashed(reset_token.token):
            continue
        reset_token.token = make_password(reset_token.token)
        reset_token.save(update_fields=["token"])


class Migration(migrations.Migration):
    dependencies = [
        ("identidade", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="passwordresettoken",
            name="token",
            field=models.CharField(blank=True, db_index=True, max_length=128, unique=True, verbose_name="Hash do token"),
        ),
        migrations.RunPython(hash_existing_password_reset_tokens, migrations.RunPython.noop),
    ]
