# LOCAL: nucleo/modelos/base.py

from django.db import models

from nucleo.mixins.auditoria import AuditoriaMixin
from nucleo.mixins.escopo_inquilino import InquilinoMixin
from nucleo.mixins.identificador import IdentificadorMixin
from nucleo.mixins.modelo.nome import NomeMixin
from nucleo.mixins.soft_delete import SoftDeleteMixin
from nucleo.mixins.versionamento import VersionamentoMixin
from .managers import ManagerAtivo


def _get_authenticated_current_user() :
	try :
		from infrastrutura.middleware.request_user import get_current_user
	except Exception :
		return None
	
	user = get_current_user()
	if user and getattr(user, "is_authenticated", False) :
		return user
	return None


# =========================================================
# CORE MODEL MULTI-TENANT
# =========================================================

class CoreModel(NomeMixin, SoftDeleteMixin, AuditoriaMixin, IdentificadorMixin, VersionamentoMixin, InquilinoMixin, models.Model, ) :
	objects = ManagerAtivo()
	all_objects = models.Manager()
	
	class Meta :
		abstract = True
		indexes = [models.Index(fields = ["deletado"]), models.Index(fields = ["versao"]), ]


# =========================================================
# CORE MODEL SEM TENANT
# =========================================================

class InqCoreModel(SoftDeleteMixin, AuditoriaMixin, IdentificadorMixin, VersionamentoMixin, models.Model, ) :
	objects = ManagerAtivo()
	all_objects = models.Manager()
	
	class Meta :
		abstract = True
		indexes = [models.Index(fields = ["deletado"]), models.Index(fields = ["versao"]), ]


# =========================================================
# CORE MODEL SEM NOME
# =========================================================

class NoNameCoreModel(SoftDeleteMixin, AuditoriaMixin, IdentificadorMixin, VersionamentoMixin, InquilinoMixin, models.Model, ) :
	objects = ManagerAtivo()
	all_objects = models.Manager()
	
	class Meta :
		abstract = True