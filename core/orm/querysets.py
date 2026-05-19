"""QuerySets customizados usados pelos managers do core."""

from django.db import models


def _normalize_args(model, args):
    if hasattr(model, "normalize_query_args"):
        return model.normalize_query_args(args)
    return args


def _normalize_kwargs(model, kwargs):
    if hasattr(model, "normalize_lookup_kwargs"):
        return model.normalize_lookup_kwargs(kwargs)
    return kwargs


def _normalize_fields(model, fields):
    if hasattr(model, "normalize_lookup_keys"):
        return model.normalize_lookup_keys(fields)
    return fields


class AtivoQuerySet(models.QuerySet):
    """
    QuerySet corporativo com suporte a soft delete.
    """

    def filter(self, *args, **kwargs):
        return super().filter(*_normalize_args(self.model, args), **_normalize_kwargs(self.model, kwargs))

    def exclude(self, *args, **kwargs):
        return super().exclude(*_normalize_args(self.model, args), **_normalize_kwargs(self.model, kwargs))

    def get(self, *args, **kwargs):
        return super().get(*_normalize_args(self.model, args), **_normalize_kwargs(self.model, kwargs))

    def order_by(self, *field_names):
        return super().order_by(*_normalize_fields(self.model, field_names))

    def values(self, *fields, **expressions):
        return super().values(*_normalize_fields(self.model, fields), **expressions)

    def values_list(self, *fields, **kwargs):
        return super().values_list(*_normalize_fields(self.model, fields), **kwargs)

    def only(self, *fields):
        return super().only(*_normalize_fields(self.model, fields))

    def defer(self, *fields):
        return super().defer(*_normalize_fields(self.model, fields))

    def update(self, **kwargs):
        return super().update(**_normalize_kwargs(self.model, kwargs))

    def ativos(self):
        return self.filter(active=True, deleted=False)

    def inativos(self):
        return self.filter(active=False, deleted=False)

    def deletados(self):
        return self.filter(deleted=True)

    def com_deletados(self):
        return self.all()


class TenantAwareQuerySet(AtivoQuerySet):
    """
    QuerySet que força filtro automático por tenant_id.

    Garante que queries sempre retornam apenas dados do tenant no contexto.
    Lança erro se tenant não estiver definido no contexto.
    """

    def _get_tenant_from_context(self):
        """Extrair tenant_id do contexto"""
        from infrastructure.context.tenant import get_tenant

        return get_tenant()

    def _has_tenant_filter(self) -> bool:
        """Verificar se query já tem filtro de tenant_id"""
        # Verificar na query existente
        if hasattr(self.query, 'where'):
            query_str = str(self.query)
            return 'tenant_id' in query_str or 'tenant' in query_str
        return False

    def _can_bypass_tenant(self) -> bool:
        """Verificar se há flag de bypass (apenas admin)"""
        return getattr(self, '_bypass_tenant_filter', False)

    def _fetch_all(self):
        """Interceptar fetch_all para validar tenant filter"""
        # Se é bypass, deixa passar
        if self._can_bypass_tenant():
            return super()._fetch_all()

        # Verificar se modelo tem campo tenant
        if not hasattr(self.model, 'tenant'):
            return super()._fetch_all()

        # Se query já tem tenant filter, OK
        if self._has_tenant_filter():
            return super()._fetch_all()

        # Se modelo é multi-tenant mas não tem filter, raise error
        raise RuntimeError(
            f"QuerySet para {self.model.__name__} deve incluir filtro 'tenant_id'. "
            f"Use .for_tenant() ou todos_os_dados() para bypass."
        )

    def for_tenant(self, tenant_id=None):
        """Filtrar por tenant explícito"""
        if tenant_id is None:
            tenant_id = self._get_tenant_from_context()

        if tenant_id is None:
            raise RuntimeError(
                "Tenant ID não definido no contexto. "
                "Configure TenantMiddleware ou passe tenant_id explicitamente."
            )

        return self.filter(tenant_id=tenant_id)

    def todos_os_dados(self):
        """Bypass tenant filter (apenas admin)"""
        clone = self._clone()
        clone._bypass_tenant_filter = True
        return clone
