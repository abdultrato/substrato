# Repair local databases whose migration history was reset while the old
# enfermagem_registroenfermagem table was kept in the Docker volume.

from django.db import migrations


TABLE = "enfermagem_registroenfermagem"


POSTGRES_REPAIR_SQL = """
ALTER TABLE enfermagem_registroenfermagem
    ADD COLUMN IF NOT EXISTS lab_request_id bigint NULL,
    ADD COLUMN IF NOT EXISTS record_kind varchar(40) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN IF NOT EXISTS origin_role varchar(60) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS collection_guidance jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'enf_reg_lab_request_uniq'
    ) THEN
        ALTER TABLE enfermagem_registroenfermagem
            ADD CONSTRAINT enf_reg_lab_request_uniq UNIQUE (lab_request_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'enf_reg_lab_request_fk'
    ) THEN
        ALTER TABLE enfermagem_registroenfermagem
            ADD CONSTRAINT enf_reg_lab_request_fk
            FOREIGN KEY (lab_request_id)
            REFERENCES clinico_requisicaoanalise(id)
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS enf_reg_record_kind_idx
    ON enfermagem_registroenfermagem (record_kind);
CREATE INDEX IF NOT EXISTS enf_reg_record_kind_date_idx
    ON enfermagem_registroenfermagem (record_kind, record_date);
CREATE INDEX IF NOT EXISTS enf_reg_lab_request_deleted_idx
    ON enfermagem_registroenfermagem (lab_request_id, deleted);
"""


def _table_exists(connection, cursor, table_name):
    return table_name in connection.introspection.table_names(cursor)


def _column_names(connection, cursor):
    return {column.name for column in connection.introspection.get_table_description(cursor, TABLE)}


def repair_schema(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        if not _table_exists(connection, cursor, TABLE):
            return

        if connection.vendor == "postgresql":
            cursor.execute(POSTGRES_REPAIR_SQL)
            return

        columns = _column_names(connection, cursor)
        column_definitions = {
            "lab_request_id": "bigint NULL",
            "record_kind": "varchar(40) NOT NULL DEFAULT 'MANUAL'",
            "origin_role": "varchar(60) NOT NULL DEFAULT ''",
            "collection_guidance": "text NOT NULL DEFAULT '[]'",
        }
        table_name = schema_editor.quote_name(TABLE)

        for column_name, definition in column_definitions.items():
            if column_name not in columns:
                schema_editor.execute(
                    f"ALTER TABLE {table_name} ADD COLUMN {schema_editor.quote_name(column_name)} {definition}"
                )
                columns.add(column_name)

        if {"record_kind"}.issubset(columns):
            schema_editor.execute(
                f"CREATE INDEX IF NOT EXISTS enf_reg_record_kind_idx ON {table_name} "
                f"({schema_editor.quote_name('record_kind')})"
            )

        if {"record_kind", "record_date"}.issubset(columns):
            schema_editor.execute(
                f"CREATE INDEX IF NOT EXISTS enf_reg_record_kind_date_idx ON {table_name} "
                f"({schema_editor.quote_name('record_kind')}, {schema_editor.quote_name('record_date')})"
            )

        if {"lab_request_id", "deleted"}.issubset(columns):
            schema_editor.execute(
                f"CREATE INDEX IF NOT EXISTS enf_reg_lab_request_deleted_idx ON {table_name} "
                f"({schema_editor.quote_name('lab_request_id')}, {schema_editor.quote_name('deleted')})"
            )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("clinical", "0005_resultitem_disregard_workflow"),
        ("enfermagem", "0005_nursingevolution_ward_nursingprescription_ward_and_more"),
    ]

    operations = [
        migrations.RunPython(repair_schema, reverse_code=migrations.RunPython.noop),
    ]
