"""Modelos base e managers compartilhados (CoreModel, InqCoreModel)."""

from .base import CoreModel, InqCoreModel
from .managers import ManagerAtivo, QuerySetAtivo

__all__ = ["CoreModel", "InqCoreModel", "ManagerAtivo", "QuerySetAtivo"]
