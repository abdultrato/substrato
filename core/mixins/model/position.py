"""Mixins para ordenação posicional por escopo de relacionamento."""

from __future__ import annotations

from django.db import models


class PositionMixin(models.Model):
    """Campo de posição para ordenação manual/sequencial."""

    position = models.PositiveIntegerField(
        default=0,
        db_index=True,
    )

    class Meta:
        abstract = True


class ScopedPositionMixin(PositionMixin):
    """
    Atribui automaticamente `position` na criação, por escopo definido no model.

    Exemplo:
    - `position_scope_fields = ("exam",)` para ordenar campos dentro de um exame.
    - `position_scope_fields = ("invoice",)` para ordenar itens dentro de uma fatura.
    """

    position_scope_fields: tuple[str, ...] = ()
    position_start_at: int = 1

    class Meta:
        abstract = True

    @classmethod
    def _position_manager(cls):
        return getattr(cls, "all_objects", cls._default_manager)

    def _scope_filters(self):
        if not self.position_scope_fields:
            return {}

        filters: dict[str, object] = {}

        for field_name in self.position_scope_fields:
            field = self._meta.get_field(field_name)
            if field.is_relation:
                key = f"{field_name}_id"
            else:
                key = field_name

            value = getattr(self, key, None)
            if value in (None, ""):
                return None
            filters[key] = value

        return filters

    def _next_position(self) -> int:
        scope = self._scope_filters()
        if scope is None:
            return self.position_start_at

        queryset = self.__class__._position_manager().filter(**scope)
        if self.pk:
            queryset = queryset.exclude(pk=self.pk)

        max_position = queryset.aggregate(max_position=models.Max("position")).get("max_position") or 0
        next_position = int(max_position) + 1
        return next_position if next_position >= self.position_start_at else self.position_start_at

    def _should_auto_assign_position(self) -> bool:
        if self.pk:
            return False
        current = getattr(self, "position", 0) or 0
        return int(current) <= 0

    def save(self, *args, **kwargs):
        if self._should_auto_assign_position():
            self.position = self._next_position()
        return super().save(*args, **kwargs)
