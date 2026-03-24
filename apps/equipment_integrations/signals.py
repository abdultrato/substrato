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

    inquilino_id = instance.inquilino_id
    if not inquilino_id:
        return

    tipo_exame = None
    setor = None
    if instance.exame_id:
        tipo_exame = IntegrationRouting.ExamType.LABORATORIO
        setor = getattr(instance.exame, "setor", None)
    elif instance.exame_medico_id:
        tipo_exame = IntegrationRouting.ExamType.MEDICO
        setor = getattr(instance.exame_medico, "setor", None)

    if not tipo_exame or not setor:
        return

    roteamento = (
        IntegrationRouting.objects.filter(
            inquilino_id=inquilino_id,
            ativo=True,
            tipo_exame=tipo_exame,
            setor=setor,
            deletado=False,
        )
        .select_related("equipamento")
        .order_by("id")
        .first()
    )

    if roteamento is None:
        return

    equipamento = roteamento.equipamento
    if not equipamento.ativo:
        return

    ordem, _ = IntegrationOrder.objects.get_or_create(
        inquilino_id=inquilino_id,
        equipamento=equipamento,
        requisicao=instance.requisicao,
        defaults={"estado": IntegrationOrder.Estado.PENDENTE},
    )

    IntegrationOrderItem.objects.get_or_create(
        inquilino_id=inquilino_id,
        ordem=ordem,
        requisicao_item=instance,
        defaults={"estado": IntegrationOrderItem.Estado.PENDENTE},
    )


criar_ordem_integracao_para_item = create_integration_order_for_item
