from datetime import timedelta
from hashlib import sha256

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

# =========================================================
# BASE CORPORATIVA
# =========================================================


class CorporateFilterBackend:
    """
    Backend base corporativo.

    - Aplica isolamento por tenant.
    - Aplica filtros automáticos por query string.
    """

    tenant_field = "inquilino"

    def filter_queryset(self, request, queryset, view):

        queryset = self._apply_tenant_filter(request, queryset)
        return self._apply_auto_filters(request, queryset)

    # -----------------------------------------------------
    # MULTI TENANT ISOLATION
    # -----------------------------------------------------

    def _apply_tenant_filter(self, request, queryset):

        tenant = getattr(request, "inquilino", None)

        if tenant is None:
            return queryset.none()

        if hasattr(queryset.model, self.tenant_field):
            return queryset.filter(**{self.tenant_field: tenant})

        return queryset

    # -----------------------------------------------------
    # AUTO DISCOVER FILTER FIELDS
    # -----------------------------------------------------

    def _apply_auto_filters(self, request, queryset):

        model_fields = {field.name for field in queryset.model._meta.get_fields() if hasattr(field, "attname")}

        for param, value in request.query_params.items():
            if not value:
                continue

            # Range automático
            if param.endswith("_min"):
                field = param[:-4]
                if field in model_fields:
                    queryset = queryset.filter(**{f"{field}__gte": value})

            elif param.endswith("_max"):
                field = param[:-4]
                if field in model_fields:
                    queryset = queryset.filter(**{f"{field}__lte": value})

            # Filtro direto
            elif param in model_fields:
                queryset = queryset.filter(**{param: value})

        return queryset


# =========================================================
# RELATIVE DATE FILTER ENTERPRISE
# =========================================================


class CorporateRelativeDateFilter:
    def filter_queryset(self, request, queryset, view):

        field = getattr(view, "relative_date_field", None)
        if not field:
            return queryset

        value = request.query_params.get(field)
        if not value:
            return queryset

        now = timezone.now()

        if value == "today":
            start = now.replace(hour=0, minute=0, second=0)
        elif value.endswith("d") and value[:-1].isdigit():
            start = now - timedelta(days=int(value[:-1]))
        else:
            return queryset

        return queryset.filter(**{f"{field}__gte": start})


# =========================================================
# FULL TEXT (Opcional)
# =========================================================

try:
    from django.contrib.postgres.search import (
        SearchQuery,
        SearchRank,
        SearchVector,
    )

    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False


class CorporateFullTextSearch(SearchFilter):
    def filter_queryset(self, request, queryset, view):

        if not POSTGRES_AVAILABLE:
            return super().filter_queryset(request, queryset, view)

        search_term = request.query_params.get(self.search_param)
        if not search_term:
            return queryset

        vector_fields = getattr(view, "search_vector_fields", None)
        if not vector_fields:
            return super().filter_queryset(request, queryset, view)

        vector = SearchVector(*vector_fields)
        query = SearchQuery(search_term)

        return queryset.annotate(rank=SearchRank(vector, query)).filter(rank__gte=0.1).order_by("-rank")


# =========================================================
# CACHE SEGURO MULTI TENANT
# =========================================================


class CorporateQueryCacheMixin:
    """
    Cache por tenant, usuário e query string.
    """

    cache_timeout = getattr(settings, "DEFAULT_QUERY_CACHE_TIMEOUT", 60)

    def dispatch(self, request, *args, **kwargs):

        if request.method != "GET":
            return super().dispatch(request, *args, **kwargs)

        tenant = getattr(request, "inquilino", None)
        user_id = getattr(request.user, "id", "anon")

        raw_key = f"{tenant.id if tenant else 'no'}:{user_id}:{request.get_full_path()}"
        cache_key = "viewcache:" + sha256(raw_key.encode()).hexdigest()

        cached = cache.get(cache_key)
        if cached:
            return cached

        response = super().dispatch(request, *args, **kwargs)

        # Armazena dados serializados
        if hasattr(response, "data"):
            cache.set(cache_key, response, self.cache_timeout)

        return response


# =========================================================
# ORDERING ENTERPRISE
# =========================================================


class CorporateOrderingFilter(OrderingFilter):
    def remove_invalid_fields(self, queryset, fields, view, request):

        valid_fields = getattr(view, "ordering_fields", None)

        if valid_fields is None:
            return super().remove_invalid_fields(queryset, fields, view, request)

        return [f for f in fields if f.lstrip("-") in valid_fields]


# =========================================================
# BACKENDS PADRÃO CORPORATIVOS
# =========================================================

CORPORATE_FILTER_BACKENDS = [
    CorporateFilterBackend,
    DjangoFilterBackend,
    CorporateRelativeDateFilter,
    CorporateFullTextSearch,
    CorporateOrderingFilter,
]

__all__ = [
    "CORPORATE_FILTER_BACKENDS",
    "CorporateFilterBackend",
    "CorporateFullTextSearch",
    "CorporateOrderingFilter",
    "CorporateQueryCacheMixin",
    "CorporateRelativeDateFilter",
    "DjangoFilterBackend",
    "OrderingFilter",
    "SearchFilter",
]
