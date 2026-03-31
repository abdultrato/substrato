
"""Reexportações convenientes de modelos base e managers."""

from core.models.base import AuditModel, BaseModel, CoreModel, IdentityModel, InqCoreModel, NoNameCoreModel
from core.models.managers import AllObjectsManager, ManagerAtivo, QuerySetAtivo

__all__ = [
    "AllObjectsManager",
    "AuditModel",
    "BaseModel",
    "CoreModel",
    "IdentityModel",
    "InqCoreModel",
    "ManagerAtivo",
    "NoNameCoreModel",
    "QuerySetAtivo",
]
