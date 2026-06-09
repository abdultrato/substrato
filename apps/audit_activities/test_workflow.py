"""Garante que a trilha de auditoria é imutável (read-only) via API (§27.6/§27.30)."""

from __future__ import annotations

from rest_framework.mixins import (
    CreateModelMixin,
    DestroyModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
    UpdateModelMixin,
)

from api.v1.audit.viewsets import UserActivityViewSet


def test_user_activity_viewset_is_read_only():
    # Auditoria é append-only: criada por middleware, nunca via API.
    assert issubclass(UserActivityViewSet, ListModelMixin)
    assert issubclass(UserActivityViewSet, RetrieveModelMixin)
    assert not issubclass(UserActivityViewSet, CreateModelMixin)
    assert not issubclass(UserActivityViewSet, UpdateModelMixin)
    assert not issubclass(UserActivityViewSet, DestroyModelMixin)


def test_user_activity_viewset_exposes_only_safe_methods():
    actions = UserActivityViewSet().get_extra_actions()
    # Nenhuma ação de escrita personalizada deve mutar a trilha.
    write_methods = {"post", "put", "patch", "delete"}
    for extra in actions:
        mapped = {m.lower() for m in getattr(extra, "mapping", {})}
        assert not (mapped & write_methods), f"Ação de escrita inesperada na auditoria: {extra.__name__}"
