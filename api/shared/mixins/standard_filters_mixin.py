from api.shared.filters.corporate_filters import DjangoFilterBackend, OrderingFilter, SearchFilter


class StandardFiltersMixin:
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
