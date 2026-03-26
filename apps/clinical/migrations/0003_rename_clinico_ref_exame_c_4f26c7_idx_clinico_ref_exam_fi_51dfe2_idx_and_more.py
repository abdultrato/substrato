# Stub migration to preserve history after app label rename to "clinical".
# The original migration content is unavailable; operations are left empty
# because this migration is already applied in existing environments.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("clinical", "0002_initial"),
    ]

    operations = []
