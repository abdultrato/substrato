# encoding: utf-8
from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend as DjangoFilterBackendBase


class DjangoFilterBackend(DjangoFilterBackendBase):
    """
    django-filter backend com suporte a OpenAPI (DRF AutoSchema).

    Versoes recentes do DRF esperam `get_schema_operation_parameters` nos
    filter backends. O django-filter nao expoe esse metodo, entao retornamos
    lista vazia apenas para gerar schema sem quebrar.
    """

    def get_schema_operation_parameters(self, view):  # pragma: no cover
        return []

