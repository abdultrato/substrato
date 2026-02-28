from .escopo_inquilino import InquilinoMixin
from .soft_delete import SoftDeleteMixin
from .versionamento import VersionamentoMixin
from .auditoria import AuditoriaMixin
from .identificador import IdentificadorMixin

__all__ = [
		"IdentificadorMixin", "VersionamentoMixin", "InquilinoMixin",
		"AuditoriaMixin", "SoftDeleteMixin",
		]
