from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """
    Paginação padrão com metadados e links.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "meta": {
                    "total": self.page.paginator.count,
                    "total_pages": self.page.paginator.num_pages,
                    "page": self.page.number,
                    "per_page": self.get_page_size(self.request),
                    "has_next": self.page.has_next(),
                    "has_previous": self.page.has_previous(),
                },
                "links": {
                    "next": self.get_next_link(),
                    "previous": self.get_previous_link(),
                },
                "results": data,
            }
        )
