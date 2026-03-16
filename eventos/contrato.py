from abc import ABC
from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import uuid4


@dataclass
class Evento(ABC):
    """
    Contrato base de evento corporativo.
    """

    nome: str
    payload: dict
    ocorrido_em: datetime = field(default_factory=lambda: datetime.now(tz=UTC))
    identificador: str | None = None

    def __post_init__(self):
        if not self.identificador:
            self.identificador = str(uuid4())
