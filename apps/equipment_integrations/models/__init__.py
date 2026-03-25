from . import message
from .credential import IntegrationCredential
from .equipment import IntegrationEquipment
from .mapping import IntegrationAnalyteMapping
from .message import IntegrationDocument, IntegrationMessage
from .order import IntegrationOrder, IntegrationOrderItem
from .routing import IntegrationRouting

IntegracaoCredencial = IntegrationCredential
IntegracaoDocumento = IntegrationDocument
IntegracaoEquipamento = IntegrationEquipment
IntegracaoMapeamentoAnalito = IntegrationAnalyteMapping
IntegracaoMensagem = IntegrationMessage
IntegracaoOrdem = IntegrationOrder
IntegracaoOrdemItem = IntegrationOrderItem
IntegracaoRoteamento = IntegrationRouting
mensagem = message

__all__ = [
    "IntegracaoCredencial",
    "IntegracaoDocumento",
    "IntegracaoEquipamento",
    "IntegracaoMapeamentoAnalito",
    "IntegracaoMensagem",
    "IntegracaoOrdem",
    "IntegracaoOrdemItem",
    "IntegracaoRoteamento",
    "IntegrationAnalyteMapping",
    "IntegrationCredential",
    "IntegrationDocument",
    "IntegrationEquipment",
    "IntegrationMessage",
    "IntegrationOrder",
    "IntegrationOrderItem",
    "IntegrationRouting",
    "mensagem",
    "message",
]
