"""Metadata DRF do Substrato.

Estende ``SimpleMetadata`` para sinalizar campos de relação múltipla (M2M).
O ``SimpleMetadata`` padrão reporta tanto FK como M2M com ``type: "field"``,
o que impede o frontend de distinguir uma seleção única de uma múltipla. Aqui
acrescentamos ``multiple: true`` aos campos ``ManyRelatedField`` para que o
formulário gere um seletor de múltiplos (pesquisar + adicionar/remover).
"""

from __future__ import annotations

from rest_framework.metadata import SimpleMetadata
from rest_framework.relations import ManyRelatedField


class SubstratoMetadata(SimpleMetadata):
    """SimpleMetadata + flag ``multiple`` para campos M2M."""

    def get_field_info(self, field):
        info = super().get_field_info(field)
        if isinstance(field, ManyRelatedField) or getattr(field, "many", False):
            info["multiple"] = True
        return info
