# Generated for VAT-by-product-type business rule.

from decimal import Decimal

from django.db import migrations


def forwards_apply_vat_by_type(apps, schema_editor):
    """Materiais -> 16%, medicamentos/outros -> 5%."""
    model = apps.get_model("farmacia", "Product")
    model.objects.filter(type="MAT").update(vat_percentage=Decimal("16.00"))
    model.objects.exclude(type="MAT").update(vat_percentage=Decimal("5.00"))


def reverse_apply_vat_by_type(apps, schema_editor):
    """Reverte todos para 5% (estado anterior)."""
    model = apps.get_model("farmacia", "Product")
    model.objects.all().update(vat_percentage=Decimal("5.00"))


class Migration(migrations.Migration):

    dependencies = [
        ("farmacia", "0006_default_vat_5_percent"),
    ]

    operations = [
        migrations.RunPython(forwards_apply_vat_by_type, reverse_apply_vat_by_type),
    ]
