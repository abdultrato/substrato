from django.db import models

from nucleo.mixins.auditoria import AuditoriaMixin
from nucleo.mixins.escopo_inquilino import InquilinoMixin
from nucleo.mixins.identificador import IdentificadorMixin
from nucleo.mixins.modelo.nome import NomeMixin
from nucleo.mixins.soft_delete import SoftDeleteMixin
from nucleo.mixins.versionamento import VersionamentoMixin

from .managers import ManagerAtivo

# =========================================================
# BASE MODEL (RAIZ)
# =========================================================


class BaseModel(models.Model):
    """
    Modelo base mínimo.
    Serve apenas para padronizar herança.
    """

    class Meta:
        abstract = True


# =========================================================
# BASE COM IDENTIDADE
# =========================================================


class IdentidadeModel(IdentificadorMixin, BaseModel):
    """
    Adiciona identificador customizado (id_custom).
    """

    class Meta:
        abstract = True


# =========================================================
# BASE COM AUDITORIA E VERSIONAMENTO
# =========================================================


class AuditoriaModel(AuditoriaMixin, VersionamentoMixin, BaseModel):
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


class TenantModel(InquilinoMixin, BaseModel):
    """
    Adiciona escopo de inquilino.
    """

    class Meta:
        abstract = True


# =========================================================
# CORE MODEL MULTI-TENANT (COM NOME)
# =========================================================


class CoreModel(
    NomeMixin,
    IdentificadorMixin,
    AuditoriaMixin,
    VersionamentoMixin,
    SoftDeleteMixin,
    InquilinoMixin,
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
    IdentificadorMixin,
    AuditoriaMixin,
    VersionamentoMixin,
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
    IdentificadorMixin,
    AuditoriaMixin,
    VersionamentoMixin,
    SoftDeleteMixin,
    InquilinoMixin,
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
