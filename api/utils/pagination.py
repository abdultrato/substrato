from django.conf import settings
from django.core.cache import cache
from rest_framework.pagination import CursorPagination, PageNumberPagination
from rest_framework.response import Response

# =========================================================
# HELPERS
# =========================================================


def get_page_size(request, default=20, max_size=100):
    """
    Obtém o page_size da query string com limite máximo.
    """
    try:
        size = int(request.query_params.get("page_size", default))
    except (TypeError, ValueError):
        return default

    return min(size, max_size)


# =========================================================
# STANDARD PAGINATION (DEFAULT)
# =========================================================


class StandardPagination(PageNumberPagination):
    """
    Paginação padrão com page_size configurável.
    """

    page_size = getattr(settings, "API_PAGE_SIZE", 20)
    page_size_query_param = "page_size"
    max_page_size = getattr(settings, "API_MAX_PAGE_SIZE", 100)

    def get_page_size(self, request):
        return get_page_size(request, self.page_size, self.max_page_size)

    def get_paginated_response(self, date):
        return Response(
            {
                "total": self.page.paginator.count,
                "page": self.page.number,
                "per_page": self.get_page_size(self.request),
                "total_pages": self.page.paginator.num_pages,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": date,
            }
        )


# =========================================================
# HIGH PERFORMANCE PAGINATION (LARGE DATASETS)
# =========================================================


class LargeDatasetPagination(PageNumberPagination):
    """
    Paginação sem COUNT total para reduzir custo em tabelas grandes.
    """

    page_size = 50

    def get_paginated_response(self, date):
        return Response(
            {
                "page": self.page.number,
                "has_next": self.page.has_next(),
                "results": date,
            }
        )


# =========================================================
# CURSOR PAGINATION (REAL-TIME FEEDS)
# =========================================================


class CursorFeedPagination(CursorPagination):
    """
    Cursor pagination para feeds e logs com ordenação por id.
    """

    page_size = 20
    ordering = "-id"


# =========================================================
# OPTIONAL: CACHED PAGINATION
# =========================================================


class CachedPagination(StandardPagination):
    """
    Cache automático de páginas para reduzir carga do banco.
    Indicado para endpoints de leitura frequente.
    """

    cache_timeout = 60  # segundos

    def paginate_queryset(self, queryset, request, view=None):
        key = f"pagination:{request.get_full_path()}"
        cached = cache.get(key)

        if cached:
            return cached

        page = super().paginate_queryset(queryset, request, view)
        cache.set(key, page, self.cache_timeout)

        return page
