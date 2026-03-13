from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem

logger = logging.getLogger("integracoes_equipamentos.sinais")


@receiver(post_save, sender=RequisicaoItem)
def criar_ordem_integracao_para_item(sender, instance: RequisicaoItem, created: bool, **kwargs):
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
        from aplicativos.integracoes_equipamentos.modelos.ordem import (
            IntegracaoOrdem,
            IntegracaoOrdemItem,
        )
        from aplicativos.integracoes_equipamentos.modelos.roteamento import IntegracaoRoteamento
    except Exception:
        logger.exception("Falha ao importar modelos de integração")
        return

    inquilino_id = instance.inquilino_id
    if not inquilino_id:
        return

    tipo_exame = None
    setor = None
    if instance.exame_id:
        tipo_exame = IntegracaoRoteamento.TipoExame.LABORATORIO
        setor = getattr(instance.exame, "setor", None)
    elif instance.exame_medico_id:
        tipo_exame = IntegracaoRoteamento.TipoExame.MEDICO
        setor = getattr(instance.exame_medico, "setor", None)

    if not tipo_exame or not setor:
        return

    roteamento = (
        IntegracaoRoteamento.objects.filter(
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

    ordem, _ = IntegracaoOrdem.objects.get_or_create(
        inquilino_id=inquilino_id,
        equipamento=equipamento,
        requisicao=instance.requisicao,
        defaults={"estado": IntegracaoOrdem.Estado.PENDENTE},
    )

    IntegracaoOrdemItem.objects.get_or_create(
        inquilino_id=inquilino_id,
        ordem=ordem,
        requisicao_item=instance,
        defaults={"estado": IntegracaoOrdemItem.Estado.PENDENTE},
    )

