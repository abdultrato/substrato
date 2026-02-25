"""
Filtros avançados reutilizáveis para APIs DRF.

Inclui:
• filtros por intervalo (min/max)
• filtros por datas relativas
• busca full-text PostgreSQL
• suporte multi-tenant
• cache opcional para queries pesadas
"""

from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

try:
    from django.contrib.postgres.search import (
        SearchQuery,
        SearchRank,
        SearchVector,
    )

    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False


# =========================================================
# FILTER BACKEND BASE
# =========================================================


class DefaultFilterBackend(DjangoFilterBackend):
    """
    Backend base seguro para filtros estruturados.
    """

    def get_filterset_kwargs(self, request, queryset, view):
        kwargs = super().get_filterset_kwargs(request, queryset, view)

        data = kwargs.get("data")
        if data:
            kwargs["data"] = {k: v for k, v in data.items() if v not in ("", None)}

        return kwargs


# =========================================================
# RANGE FILTER SUPPORT (?preco_min=10&preco_max=100)
# =========================================================


class RangeFilterBackend:
    """
    Permite filtros por intervalo automaticamente.

    Exemplo:
        ?preco_min=10&preco_max=100
        ?data_criacao_min=2024-01-01
    """

    RANGE_SUFFIXES = ("_min", "_max")

    def filter_queryset(self, request, queryset, view):
        params = request.query_params

        for param, value in params.items():
            if not value:
                continue

            if param.endswith("_min"):
                field = param[:-4]
                queryset = queryset.filter(**{f"{field}__gte": value})

            elif param.endswith("_max"):
                field = param[:-4]
                queryset = queryset.filter(**{f"{field}__lte": value})

        return queryset


# =========================================================
# RELATIVE DATE FILTER
# =========================================================


class RelativeDateFilterBackend:
    """
    Permite filtros por datas relativas.

    Exemplo:
        ?created=today
        ?created=7d
        ?created=30d
    """

    def filter_queryset(self, request, queryset, view):
        field = getattr(view, "relative_date_field", None)
        value = request.query_params.get(field)

        if not field or not value:
            return queryset

        now = timezone.now()

        if value == "today":
            start = now.replace(hour=0, minute=0, second=0)
        elif value.endswith("d"):
            days = int(value[:-1])
            start = now - timedelta(days=days)
        else:
            return queryset

        return queryset.filter(**{f"{field}__gte": start})


# =========================================================
# FULL TEXT SEARCH (PostgreSQL)
# =========================================================


class PostgresFullTextSearchFilter(SearchFilter):
    """
    Busca avançada usando PostgreSQL full-text search.

    Requer:
        search_vector_fields = ["nome", "descricao"]
    """

    def filter_queryset(self, request, queryset, view):
        search_term = request.query_params.get(self.search_param)

        if not search_term or not POSTGRES_AVAILABLE:
            return super().filter_queryset(request, queryset, view)

        vector_fields = getattr(view, "search_vector_fields", None)

        if not vector_fields:
            return super().filter_queryset(request, queryset, view)

        vector = SearchVector(*vector_fields)
        query = SearchQuery(search_term)

        queryset = queryset.annotate(rank=SearchRank(vector, query)).filter(rank__gte=0.1).order_by("-rank")

        return queryset


# =========================================================
# MULTI TENANT FILTER
# =========================================================


class TenantFilterBackend:
    """
    Restringe dados ao tenant atual automaticamente.

    Requer:
        tenant_field = "empresa"
    """

    def filter_queryset(self, request, queryset, view):
        tenant_field = getattr(view, "tenant_field", None)

        if not tenant_field:
            return queryset

        tenant = getattr(request.user, tenant_field, None)

        if tenant is None:
            return queryset.none()

        return queryset.filter(**{tenant_field: tenant})


# =========================================================
# QUERY CACHE (para endpoints pesados)
# =========================================================


class QueryCacheMixin:
    """
    Cacheia resultados de queries pesadas.

    Uso:
        class MinhaView(QueryCacheMixin, ModelViewSet):
            cache_timeout = 60
    """

    cache_timeout = getattr(settings, "DEFAULT_QUERY_CACHE_TIMEOUT", 60)

    def dispatch(self, request, *args, **kwargs):
        if request.method != "GET":
            return super().dispatch(request, *args, **kwargs)

        cache_key = f"viewcache:{request.get_full_path()}"

        cached = cache.get(cache_key)
        if cached:
            return cached

        response = super().dispatch(request, *args, **kwargs)
        cache.set(cache_key, response, self.cache_timeout)

        return response


# =========================================================
# ORDERING & SEARCH PADRÃO
# =========================================================


class DefaultSearchFilter(SearchFilter):
    def get_search_terms(self, request):
        terms = super().get_search_terms(request)
        return [t.strip() for t in terms if t.strip()]


class DefaultOrderingFilter(OrderingFilter):
    def remove_invalid_fields(self, queryset, fields, view, request):
        valid_fields = getattr(view, "ordering_fields", None)

        if valid_fields is None:
            return super().remove_invalid_fields(queryset, fields, view, request)

        return [f for f in fields if f.lstrip("-") in valid_fields]


# =========================================================
# BACKENDS PADRÃO
# =========================================================

DEFAULT_FILTER_BACKENDS = [
    TenantFilterBackend,
    RangeFilterBackend,
    RelativeDateFilterBackend,
    DefaultFilterBackend,
    PostgresFullTextSearchFilter,
    DefaultSearchFilter,
    DefaultOrderingFilter,
]


__all__ = [
    "DEFAULT_FILTER_BACKENDS",
    "QueryCacheMixin",
]
