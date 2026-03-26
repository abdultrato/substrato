from api.shared.pagination.pagination import StandardPagination


class StandardPaginationMixin:
    pagination_class = StandardPagination
