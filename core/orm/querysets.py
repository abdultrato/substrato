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
