# Stub migration to mirror previously applied history for the clinical app.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        (
            "clinical",
            "0003_rename_clinico_ref_exame_c_4f26c7_idx_clinico_ref_exam_fi_51dfe2_idx_and_more",
        ),
    ]

    operations = []
