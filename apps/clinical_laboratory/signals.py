"""Sinais do Laboratório Clínico."""

from decimal import Decimal

from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import LabOrderItem


@receiver(pre_save, sender=LabOrderItem)
def inherit_order_item_catalog_fields(sender, instance: LabOrderItem, **kwargs):
    """Mantém item de pedido alinhado ao exame selecionado no catálogo."""

    test = getattr(instance, "test", None)
    if test is None:
        return

    if not instance.sample_type:
        instance.sample_type = test.sample_type

    if instance.price in (None, Decimal("0.00")):
        instance.price = test.price
