from django.db import models

from core.mixins.audit import AuditMixin
from core.mixins.identifier import IdentifierMixin
from core.mixins.model.name import NameMixin
from core.mixins.soft_delete import SoftDeleteMixin
from core.mixins.tenant_scope import TenantMixin
from core.mixins.versioning import VersioningMixin

from .managers import ManagerAtivo

# =========================================================
# BASE MODEL (RAIZ)
# =========================================================


class BaseModel(models.Model):
    """
    Modelo base mínimo.
    Serve para padronizar herança.
    """

    class Meta:
        abstract = True


# =========================================================
# BASE COM IDENTIDADE
# =========================================================


class IdentityModel(IdentifierMixin, BaseModel):
    """
    Adiciona identificador customizado (id_custom).
    """

    class Meta:
        abstract = True


# =========================================================
# BASE COM AUDITORIA E VERSIONAMENTO
# =========================================================


class AuditModel(AuditMixin, VersioningMixin, BaseModel):
    """
    Adiciona controle de auditoria e versionamento.
    """

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["versao"]),
        ]


# =========================================================
# BASE COM SOFT DELETE
# =========================================================


class SoftDeleteModel(SoftDeleteMixin, BaseModel):
    """
    Adiciona soft delete e managers adequados.
    """

    objects = ManagerAtivo()
    all_objects = models.Manager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["deletado"]),
        ]


# =========================================================
# BASE MULTI-TENANT
# =========================================================


class TenantModel(TenantMixin, BaseModel):
    """
    Adiciona escopo de inquilino.
    """

    class Meta:
        abstract = True


# =========================================================
# CORE MODEL MULTI-TENANT (COM NOME)
# =========================================================


class CoreModel(
    NameMixin,
    IdentifierMixin,
    AuditMixin,
    VersioningMixin,
    SoftDeleteMixin,
    TenantMixin,
    BaseModel,
):
    """
    Modelo principal utilizado na maioria das entidades.
    """

    objects = ManagerAtivo()
    all_objects = models.Manager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["deletado"]),
            models.Index(fields=["versao"]),
        ]


# =========================================================
# CORE MODEL SEM TENANT
# =========================================================


class InqCoreModel(
    IdentifierMixin,
    AuditMixin,
    VersioningMixin,
    SoftDeleteMixin,
    BaseModel,
):
    """
    Modelo base sem escopo de inquilino.
    """

    objects = ManagerAtivo()
    all_objects = models.Manager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["deletado"]),
            models.Index(fields=["versao"]),
        ]


# =========================================================
# CORE MODEL SEM NOME
# =========================================================


class NoNameCoreModel(
    IdentifierMixin,
    AuditMixin,
    VersioningMixin,
    SoftDeleteMixin,
    TenantMixin,
    BaseModel,
):
    """
    Versão do CoreModel sem campo nome.
    Usado para entidades dependentes.
    """

    objects = ManagerAtivo()
    all_objects = models.Manager()

    class Meta:
        abstract = True


IdentidadeModel = IdentityModel
AuditoriaModel = AuditModel
