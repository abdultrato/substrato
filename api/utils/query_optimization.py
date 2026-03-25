from django.db.models import Prefetch

# =========================================================
# SELECT RELATED (FK / OneToOne)
# =========================================================


def with_related(queryset, *fields):
    """
    Aplica select_related dinamicamente (ForeignKey/OneToOne).
    """
    if fields:
        return queryset.select_related(*fields)
    return queryset


# =========================================================
# PREFETCH RELATED (ManyToMany / Reverse FK)
# =========================================================


def with_prefetch(queryset, *fields):
    """
    Aplica prefetch_related dinamicamente (ManyToMany e reversos).
    """
    if fields:
        return queryset.prefetch_related(*fields)
    return queryset


# =========================================================
# PREFETCH CUSTOMIZADO (alto controle)
# =========================================================


def with_custom_prefetch(queryset, relation, custom_queryset):
    """
    Prefetch com queryset customizado.
    """
    return queryset.prefetch_related(Prefetch(relation, queryset=custom_queryset))


# =========================================================
# ONLY FIELDS (reduz payload)
# =========================================================


def only_fields(queryset, *fields):
    """
    Carrega os campos informados.
    """
    if fields:
        return queryset.only(*fields)
    return queryset


# =========================================================
# DEFER FIELDS (evita carregar campos pesados)
# =========================================================


def defer_fields(queryset, *fields):
    """
    Evita carregar campos grandes (ex.: PDF, JSON).
    """
    if fields:
        return queryset.defer(*fields)
    return queryset


# =========================================================
# LIMIT COLUMNS (modo leitura)
# =========================================================


def values_only(queryset, *fields):
    """
    Retorna dicionários com os campos informados.
    """
    return queryset.values(*fields)


# =========================================================
# COUNT SAFE (evita count pesado)
# =========================================================


def safe_count(queryset, limit=10000):
    """
    Limita o count a um value máximo.
    """
    count = queryset.count()
    return min(count, limit)


# =========================================================
# CORE OPTIMIZER (ENTRY POINT)
# =========================================================


def optimize_queryset(
    queryset,
    *,
    select=None,
    prefetch=None,
    custom_prefetch=None,
    only=None,
    defer=None,
    values=None,
):
    """
    Aplica select/prefetch/only/defer/values em um único ponto.
    """

    if select:
        queryset = queryset.select_related(*select)

    if prefetch:
        queryset = queryset.prefetch_related(*prefetch)

    if custom_prefetch:
        for relation, custom_qs in custom_prefetch:
            queryset = queryset.prefetch_related(Prefetch(relation, queryset=custom_qs))

    if only:
        queryset = queryset.only(*only)

    if defer:
        queryset = queryset.defer(*defer)

    if values:
        queryset = queryset.values(*values)

    return queryset
