from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.clinical.models.lab_request_item import LabRequestItem

logger = logging.getLogger("equipment_integrations.signals")


@receiver(post_save, sender=LabRequestItem)
def criar_ordem_integracao_para_item(sender, instance: LabRequestItem, created: bool, **kwargs):
    """
    Cria/atualiza ordens de integração (worklist) automaticamente quando um item de
    requisição é criado.

    Regras:
    - Depende de existir roteamento ativo (IntegracaoRoteamento) para o setor do exame.
    - Agrupa por (equipamento, requisicao) em uma única ordem.
    - Cria item de ordem ligando o RequisicaoItem.
    """

    if not created:
        return

    # Lazy import para evitar ciclos.
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
        tipo_exame = IntegrationRouting.TipoExame.LABORATORIO
        setor = getattr(instance.exame, "setor", None)
    elif instance.exame_medico_id:
        tipo_exame = IntegrationRouting.TipoExame.MEDICO
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
