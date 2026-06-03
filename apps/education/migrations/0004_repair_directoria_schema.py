# Repair local databases whose migration history says education.0001-0003 ran
# while some later Education tables/columns are missing from the Docker volume.

from django.db import migrations


MISSING_TABLE_MODELS = [
    "Assignment",
    "AssignmentSubmission",
    "ExaminationAttempt",
    "RandomTest",
]

MISSING_FIELDS = {
    "Examination": [
        "opens_at",
        "closes_at",
        "duration_minutes",
        "max_attempts",
        "exam_type",
        "discipline_final_stage",
        "test_slot",
        "pass_mark",
        "status",
        "published_at",
    ],
    "GradeRecord": [
        "assignment_submission",
        "examination_attempt",
    ],
}


def _table_names(connection, cursor):
    return set(connection.introspection.table_names(cursor))


def _column_names(connection, cursor, table_name):
    return {column.name for column in connection.introspection.get_table_description(cursor, table_name)}


def repair_directoria_schema(apps, schema_editor):
    connection = schema_editor.connection

    with connection.cursor() as cursor:
        tables = _table_names(connection, cursor)

    for model_name in MISSING_TABLE_MODELS:
        model = apps.get_model("education", model_name)
        if model._meta.db_table in tables:
            continue

        schema_editor.create_model(model)
        tables.add(model._meta.db_table)

    for model_name, field_names in MISSING_FIELDS.items():
        model = apps.get_model("education", model_name)
        table_name = model._meta.db_table
        if table_name not in tables:
            schema_editor.create_model(model)
            tables.add(table_name)
            continue

        with connection.cursor() as cursor:
            columns = _column_names(connection, cursor, table_name)

        for field_name in field_names:
            field = model._meta.get_field(field_name)
            if field.column in columns:
                continue

            schema_editor.add_field(model, field)
            columns.add(field.column)


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("education", "0003_alter_assignment_options_and_more"),
    ]

    operations = [
        migrations.RunPython(repair_directoria_schema, reverse_code=migrations.RunPython.noop),
    ]
