from decimal import Decimal

from django.db import migrations


def backfill_laborderitem_catalog_fields(apps, schema_editor):
    LabOrderItem = apps.get_model("laboratorio", "LabOrderItem")

    queryset = (
        LabOrderItem.objects.select_related("test")
        .all()
        .order_by("id")
    )

    for item in queryset.iterator(chunk_size=500):
        test = item.test
        updates = []

        if item.price in (None, Decimal("0.00")) and test.price is not None:
            item.price = test.price
            updates.append("price")

        if not item.sample_type and test.sample_type:
            item.sample_type = test.sample_type
            updates.append("sample_type")

        if updates:
            item.save(update_fields=updates)


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ("laboratorio", "0006_laborder_requesting_company"),
    ]

    operations = [
        migrations.RunPython(
            backfill_laborderitem_catalog_fields,
            noop_reverse,
        ),
    ]
