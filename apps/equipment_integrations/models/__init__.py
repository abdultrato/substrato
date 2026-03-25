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
mapeamento = mapping = __import__(__name__, fromlist=["mapping"]).mapping
mensagem = message
ordem = order = __import__(__name__, fromlist=["order"]).order
roteamento = routing = __import__(__name__, fromlist=["routing"]).routing
credencial = credential = __import__(__name__, fromlist=["credential"]).credential
equipamento = equipment = __import__(__name__, fromlist=["equipment"]).equipment
message = message

__all__ = [
    "credencial",
    "credential",
    "equipamento",
    "equipment",
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
    "mapeamento",
    "mapping",
    "message",
    "mensagem",
    "ordem",
    "order",
    "roteamento",
    "routing",
]
