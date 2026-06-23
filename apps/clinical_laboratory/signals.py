"""Sinais do Laboratório Clínico."""

from decimal import Decimal

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import CriticalResultNotification, LabOrderItem, LabResult


@receiver(pre_save, sender=LabOrderItem)
def inherit_order_item_catalog_fields(sender, instance: LabOrderItem, **kwargs):
    """Mantém item de pedido alinhado ao exame selecionado no catálogo."""

    test = getattr(instance, "test", None)
    if test is None:
        return

    if instance.sample_type != test.sample_type:
        instance.sample_type = test.sample_type

    if instance.price in (None, Decimal("0.00")):
        instance.price = test.price


@receiver(pre_save, sender=LabResult)
def autoflag_lab_result(sender, instance: LabResult, **kwargs):
    """Determina automaticamente o flag a partir dos limiares do campo/exame.

    Independentemente de como o resultado é gravado (workflow ``enter_result`` ou
    edição direta via API), um valor numérico é comparado com os limiares de
    referência/crítico definidos no ``LabTestField`` (ExameCampo) ou, em falta
    deste, no próprio ``LabTest`` (Exame).
    """

    if instance.numeric_value is None:
        instance.numeric_value = instance.coerce_numeric(instance.value)
    instance.inherit_catalog_metadata()
    instance.flag = instance.compute_flag()


@receiver(post_save, sender=LabResult)
def surface_critical_result(sender, instance: LabResult, **kwargs):
    """Faz com que todo resultado crítico passe para a página de críticos.

    Cria (de forma idempotente) uma ``CriticalResultNotification`` pendente
    ligada ao resultado, paciente e requisição, transformando a página de
    resultados críticos numa fila de trabalho que recebe automaticamente cada
    resultado fora dos limiares críticos.
    """

    if instance.flag not in (LabResult.Flag.CRITICAL_LOW, LabResult.Flag.CRITICAL_HIGH):
        return

    order = instance.order
    patient = getattr(order, "patient", None)
    if patient is None:
        return

    if CriticalResultNotification.objects.filter(result=instance).exists():
        return

    CriticalResultNotification.objects.create(
        tenant=instance.tenant,
        result=instance,
        order=order,
        patient=patient,
        notes="Gerado automaticamente: resultado crítico detetado.",
    )
