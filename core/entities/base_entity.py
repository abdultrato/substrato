"""Base value-object para entidades de domínio (DDD)."""

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class BaseEntity:
    """Entidade identificada por `identifier`; compara identidade."""
    identifier: str | int

    def same_identity_as(self, other) -> bool:
        return isinstance(other, BaseEntity) and self.identifier == other.identifier
