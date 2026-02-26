from abc import ABC
from dataclasses import dataclass
from datetime import datetime
from uuid import uuid4


@dataclass
class Evento(ABC):
    """
    Contrato base de evento corporativo.
    """

    nome: str
    payload: dict
    ocorrido_em: datetime = datetime.utcnow()
    identificador: str = None

    def __post_init__(self):
        if not self.identificador:
            self.identificador = str(uuid4())
