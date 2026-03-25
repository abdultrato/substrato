from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.clinical.models.lab_request_item import LabRequestItem

logger = logging.getLogger("equipment_integrations.signals")


@receiver(post_save, sender=LabRequestItem)
def create_integration_order_for_item(sender, instance: LabRequestItem, created: bool, **kwargs):
    """
    Create or update worklist orders automatically when a request item is created.
    """

    if not created:
        return

    # Lazy import avoids cycles.
    try:
        from apps.equipment_integrations.models.order import (
            IntegrationOrder,
            IntegrationOrderItem,
        )
        from apps.equipment_integrations.models.routing import IntegrationRouting
    except Exception:
        logger.exception("Falha ao importar models de integração")
        return

    tenant_id = instance.tenant_id
    if not tenant_id:
        return

    exam_type = None
    sector = None
    if instance.exam_id:
        exam_type = IntegrationRouting.ExamType.LABORATORIO
        sector = getattr(instance.exam, "sector", None)
    elif instance.medical_exam_id:
        exam_type = IntegrationRouting.ExamType.MEDICO
        sector = getattr(instance.medical_exam, "sector", None)

    if not exam_type or not sector:
        return

    roteamento = (
        IntegrationRouting.objects.filter(
            tenant_id=tenant_id,
            active=True,
            exam_type=exam_type,
            sector=sector,
            deleted=False,
        )
        .select_related("equipment")
        .order_by("id")
        .first()
    )

    if roteamento is None:
        return

    equipment = roteamento.equipment
    if not equipment.active:
        return

    order, _ = IntegrationOrder.objects.get_or_create(
        tenant_id=tenant_id,
        equipment=equipment,
        request=instance.request,
        defaults={"status": IntegrationOrder.Status.PENDING},
    )

    IntegrationOrderItem.objects.get_or_create(
        tenant_id=tenant_id,
        order=order,
        request_item=instance,
        defaults={"status": IntegrationOrderItem.Status.PENDING},
    )


criar_order_integracao_para_item = create_integration_order_for_item
