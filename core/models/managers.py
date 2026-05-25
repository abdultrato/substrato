"""Managers base: ativos e filtrados por soft delete."""

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector, TrigramSimilarity
from django.core.exceptions import FieldDoesNotExist
from django.db import connections, models
from django.db.models import Q
from django.utils import timezone

from infrastructure.context.request_user import get_current_user


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


def _model_has_field(model, field_name: str) -> bool:
    try:
        model._meta.get_field(field_name)
    except FieldDoesNotExist:
        return False
    return True


def _first_model_field(model, field_names: tuple[str, ...]) -> str | None:
    for field_name in field_names:
        if _model_has_field(model, field_name):
            return field_name
    return None


class QuerySetAtivo(models.QuerySet):
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

    def delete(self):
        if not _model_has_field(self.model, "deleted"):
            return super().delete()

        updates = {"deleted": True}
        if _model_has_field(self.model, "deleted_at"):
            updates["deleted_at"] = timezone.now()

        actor = get_current_user()
        if actor and getattr(actor, "is_authenticated", False) and _model_has_field(self.model, "deleted_by"):
            updates["deleted_by"] = actor

        count = self.update(**updates)
        return count, {self.model._meta.label: count}

    def hard_delete(self):
        return super().delete()

    def ativos(self):
        filters = {}
        active_field = _first_model_field(self.model, ("ativo", "active", "is_active"))
        if active_field is not None:
            filters[active_field] = True
        if _model_has_field(self.model, "deleted"):
            filters["deleted"] = False
        return self.filter(**filters) if filters else self

    def inativos(self):
        active_field = _first_model_field(self.model, ("ativo", "active", "is_active"))
        if active_field is None:
            return self.none()

        filters = {active_field: False}
        if _model_has_field(self.model, "deleted"):
            filters["deleted"] = False
        return self.filter(**filters)

    def deletados(self):
        if not _model_has_field(self.model, "deleted"):
            return self.none()
        return self.filter(deleted=True)

    def search(self, query, fields=None, config=None, use_trigram=False, trigram_threshold=0.3):
        """
        Perform an enhanced search on the model's fields using full-text search and optional trigram similarity.

        Args:
            query (str): The search query string.
            fields (list, optional): List of field names to search in. If None,
                defaults to ['name', 'custom_id'] if they exist on the model.
            config (str, optional): The search configuration to use (e.g., 'english', 'portuguese').
                Defaults to None, which uses the default text search configuration.
            use_trigram (bool): Whether to also use trigram similarity for fuzzy matching.
            trigram_threshold (float): Minimum similarity threshold for trigram matches (0.0 to 1.0).

        Returns:
            QuerySet: Filtered and ordered queryset ranked by relevance.
        """
        if not query:
            return self

        # If no fields are provided, try to get the default searchable fields
        if fields is None:
            fields = []
            for default_field in ("name", "custom_id", "description"):
                if _model_has_field(self.model, default_field):
                    fields.append(default_field)

            # If we still have no fields, return empty queryset
            if not fields:
                return self.none()

        if connections[self.db].vendor != "postgresql":
            conditions = Q()
            for field in fields:
                conditions |= Q(**{f"{field}__icontains": query})
            return self.filter(conditions) if conditions else self.none()

        # Start with base queryset
        queryset = self

        # Perform full-text search
        search_vector = SearchVector(*fields, config=config)
        search_query = SearchQuery(query, config=config)

        queryset = queryset.annotate(
            search=search_vector,
            rank=SearchRank(search_vector, search_query)
        ).filter(search=search_query)

        # If trigram search is requested, also add trigram similarity matches
        if use_trigram and fields:
            trigram_conditions = []
            for field in fields:
                trigram_conditions.append(
                    TrigramSimilarity(field, query) >= trigram_threshold
                )

            if trigram_conditions:
                # Combine trigram conditions with OR
                combined_trigram = Q()
                for condition in trigram_conditions:
                    combined_trigram |= condition

                # Get trigram matches
                trigram_queryset = self.filter(combined_trigram).annotate(
                    similarity=TrigramSimilarity(fields[0], query)  # Use first field for similarity scoring
                ).filter(
                    similarity__gte=trigram_threshold
                ).order_by('-similarity')

                # Combine results from both search methods
                # We'll union them and deduplicate, prioritizing full-text search results
                if queryset.exists():
                    # If we have full-text results, add trigram results that aren't already included
                    trigram_only = trigram_queryset.exclude(
                        id__in=queryset.values_list('id', flat=True)
                    )
                    if trigram_only.exists():
                        # Combine and order by relevance (full-text first, then trigram)
                        queryset = queryset | trigram_only.annotate(
                            rank=models.Value(0.0)  # Lower rank for trigram-only results
                        )
                else:
                    # If no full-text results, use only trigram results
                    queryset = trigram_queryset

        # Order by relevance
        if use_trigram and fields and queryset.exists():
            # Check if we have rank annotation (from full-text search)
            if hasattr(queryset.query, 'annotations') and 'rank' in queryset.query.annotations:
                queryset = queryset.order_by('-rank')
            elif hasattr(queryset.query, 'annotations') and 'similarity' in queryset.query.annotations:
                queryset = queryset.order_by('-similarity')
            else:
                # Fallback ordering
                queryset = queryset.order_by('-rank' if 'rank' in queryset.query.annotations else '-similarity')
        elif not (use_trigram and fields):
            # Standard full-text search ordering
            queryset = queryset.order_by('-rank')

        return queryset


class ManagerAtivo(models.Manager.from_queryset(QuerySetAtivo)):
    def get_queryset(self):
        queryset = super().get_queryset()
        if not _model_has_field(self.model, "deleted"):
            return queryset
        return queryset.filter(deleted=False)


class AllObjectsManager(models.Manager.from_queryset(QuerySetAtivo)):
    pass
