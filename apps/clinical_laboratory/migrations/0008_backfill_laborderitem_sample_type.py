from django.db import migrations


def backfill_laborderitem_sample_type(apps, schema_editor):
    LabOrderItem = apps.get_model("laboratorio", "LabOrderItem")

    queryset = (
        LabOrderItem.objects.select_related("test")
        .all()
        .order_by("id")
    )

    for item in queryset.iterator(chunk_size=500):
        test = item.test
        if item.sample_type != test.sample_type:
            item.sample_type = test.sample_type
            item.save(update_fields=["sample_type"])


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ("laboratorio", "0007_backfill_laborderitem_catalog_fields"),
    ]

    operations = [
        migrations.RunPython(
            backfill_laborderitem_sample_type,
            noop_reverse,
        ),
    ]
