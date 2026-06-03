# Repair local databases whose education migration history is complete while
# the schedule/skill tables are still absent from the physical schema.

from django.db import migrations


MISSING_TABLE_MODELS = [
    "DisciplineScheduleItem",
    "DisciplineScheduleStudentStatus",
    "Skill",
]


def _table_names(connection, cursor):
    return set(connection.introspection.table_names(cursor))


def repair_remaining_education_schema(apps, schema_editor):
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        tables = _table_names(connection, cursor)

    for model_name in MISSING_TABLE_MODELS:
        model = apps.get_model("education", model_name)
        if model._meta.db_table in tables:
            continue

        schema_editor.create_model(model)
        tables.add(model._meta.db_table)


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("education", "0004_repair_directoria_schema"),
    ]

    operations = [
        migrations.RunPython(repair_remaining_education_schema, reverse_code=migrations.RunPython.noop),
    ]
