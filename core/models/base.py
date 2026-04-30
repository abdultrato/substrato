"""Modelos base compartilhados (CoreModel/InqCoreModel)."""

from django.core.exceptions import FieldDoesNotExist
from django.db import models
from django.db.models import Q

from core.mixins.audit import AuditMixin
from core.mixins.identifier import IdentifierMixin
from core.mixins.model.name import NameMixin
from core.mixins.soft_delete import SoftDeleteMixin
from core.mixins.tenant_scope import TenantMixin
from core.mixins.versioning import VersioningMixin

from .managers import AllObjectsManager, ManagerAtivo

# =========================================================
# BASE MODEL (RAIZ)
# =========================================================


class BaseModel(models.Model):
    """
    Modelo base mínimo.
    Serve para padronizar herança.
    """

    LEGACY_FIELD_ALIASES = {
        "id_custom": "custom_id",
        "nome": "name",
        "prefixo": "prefix",
        "posicao": "position",
        "inquilino": "tenant",
        "criado_em": "created_at",
        "atualizado_em": "updated_at",
        "criado_por": "created_by",
        "atualizado_por": "updated_by",
        "deletado": "deleted",
        "deletado_em": "deleted_at",
        "deletado_por": "deleted_by",
        "versao": "version",
    }

    class Meta:
        abstract = True

    @classmethod
    def legacy_field_aliases(cls) -> dict[str, str]:
        aliases: dict[str, str] = {}

        for base in reversed(cls.__mro__):
            aliases.update(getattr(base, "LEGACY_FIELD_ALIASES", {}))

        meta = getattr(cls, "_meta", None)
        if meta is not None:
            for field in getattr(meta, "concrete_fields", ()):
                column = getattr(field, "column", None)
                attname = getattr(field, "attname", None)
                if column and attname and column != attname:
                    aliases.setdefault(column, attname)

                if getattr(field, "is_relation", False) and column and column.endswith("_id"):
                    legacy_name = column[:-3]
                    if legacy_name and legacy_name != field.name:
                        aliases.setdefault(legacy_name, field.name)

            model_table = getattr(meta, "db_table", "")
            table_prefix = f"{model_table}_"
            for field in getattr(meta, "local_many_to_many", ()):
                m2m_table = getattr(field, "db_table", None) or field.m2m_db_table()
                if (
                    m2m_table
                    and table_prefix
                    and m2m_table.startswith(table_prefix)
                    and len(m2m_table) > len(table_prefix)
                ):
                    legacy_name = m2m_table[len(table_prefix) :]
                    if legacy_name and legacy_name != field.name:
                        aliases.setdefault(legacy_name, field.name)

        return aliases

    @classmethod
    def normalize_field_name(cls, field_name: str) -> str:
        return cls.legacy_field_aliases().get(field_name, field_name)

    @classmethod
    def normalize_field_names(cls, field_names):
        return [cls.normalize_field_name(field_name) for field_name in field_names]

    @classmethod
    def normalize_lookup_key(cls, lookup_key: str) -> str:
        if not isinstance(lookup_key, str):
            return lookup_key

        prefix = ""
        if lookup_key.startswith("-"):
            prefix = "-"
            lookup_key = lookup_key[1:]

        parts = lookup_key.split("__")
        normalized_parts = []
        model = cls

        for index, part in enumerate(parts):
            if part == "pk":
                normalized_parts.append(part)
                model = None
                continue

            normalized_part = part
            if model is not None and hasattr(model, "normalize_field_name"):
                normalized_part = model.normalize_field_name(part)

            field = None
            if model is not None:
                try:
                    field = model._meta.get_field(normalized_part)
                except FieldDoesNotExist:
                    normalized_parts.extend(parts[index:])
                    break

            if field is None:
                normalized_parts.append(normalized_part)
                model = None
                continue

            normalized_parts.append(field.name)
            related_model = getattr(field, "related_model", None)
            model = related_model if related_model is not None and getattr(field, "is_relation", False) else None

        return prefix + "__".join(normalized_parts)

    @classmethod
    def normalize_lookup_keys(cls, lookup_keys):
        return [cls.normalize_lookup_key(lookup_key) for lookup_key in lookup_keys]

    @classmethod
    def normalize_lookup_kwargs(cls, kwargs):
        return {cls.normalize_lookup_key(key): value for key, value in kwargs.items()}

    @classmethod
    def normalize_query_arg(cls, arg):
        if not isinstance(arg, Q):
            return arg

        normalized = Q()
        normalized.connector = arg.connector
        normalized.negated = arg.negated
        normalized.children = [
            cls.normalize_query_arg(child)
            if isinstance(child, Q)
            else (cls.normalize_lookup_key(child[0]), child[1])
            if isinstance(child, tuple) and len(child) == 2
            else child
            for child in arg.children
        ]
        return normalized

    @classmethod
    def normalize_query_args(cls, args):
        return [cls.normalize_query_arg(arg) for arg in args]

    def __init__(self, *args, **kwargs):
        normalized_kwargs = {}
        for key, value in kwargs.items():
            normalized_key = self.normalize_field_name(key)
            if normalized_key in normalized_kwargs:
                continue
            normalized_kwargs[normalized_key] = value
        super().__init__(*args, **normalized_kwargs)

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = self.normalize_field_names(update_fields)
        return super().save(*args, **kwargs)

    def __getattr__(self, name):
        normalized_name = self.normalize_field_name(name)
        if normalized_name != name:
            return super().__getattribute__(normalized_name)
        raise AttributeError(f"{self.__class__.__name__!s} object has no attribute {name!r}")

    def __setattr__(self, name, value):
        normalized_name = self.normalize_field_name(name)
        super().__setattr__(normalized_name, value)


# =========================================================
# BASE COM IDENTIDADE
# =========================================================


class IdentityModel(IdentifierMixin, BaseModel):
    """
    Adiciona identificador customizado (custom_id).
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
            models.Index(fields=["version"]),
        ]


# =========================================================
# BASE COM SOFT DELETE
# =========================================================


class SoftDeleteModel(SoftDeleteMixin, BaseModel):
    """
    Adiciona soft delete e managers adequados.
    """

    objects = ManagerAtivo()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["deleted"]),
        ]


# =========================================================
# BASE MULTI-TENANT
# =========================================================


class TenantModel(TenantMixin, BaseModel):
    """
    Adiciona escopo de tenant.
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
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["deleted"]),
            models.Index(fields=["version"]),
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
    Modelo base sem escopo de tenant.
    """

    objects = ManagerAtivo()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=["deleted"]),
            models.Index(fields=["version"]),
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
    Versão do CoreModel sem campo name.
    Usado para entidades dependentes.
    """

    objects = ManagerAtivo()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True


IdentidadeModel = IdentityModel
AuditoriaModel = AuditModel
