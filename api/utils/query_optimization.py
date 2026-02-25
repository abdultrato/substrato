from django.db.models import Prefetch

# =========================================================
# SELECT RELATED (FK / OneToOne)
# =========================================================


def with_related(queryset, *fields):
    """
    Aplica select_related dinamicamente.
    Use para ForeignKey e OneToOne.
    """
    if fields:
        return queryset.select_related(*fields)
    return queryset


# =========================================================
# PREFETCH RELATED (ManyToMany / Reverse FK)
# =========================================================


def with_prefetch(queryset, *fields):
    """
    Aply prefetch_related dinamicamente.
    Use para ManyToMany e relacionamentos reversos.
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
    Carrega apenas campos necessários.
    Reduz uso de memória.
    """
    if fields:
        return queryset.only(*fields)
    return queryset


# =========================================================
# DEFER FIELDS (evita carregar campos pesados)
# =========================================================


def defer_fields(queryset, *fields):
    """
    Evita carregar campos grandes (ex: PDF, JSON grande).
    """
    if fields:
        return queryset.defer(*fields)
    return queryset


# =========================================================
# LIMIT COLUMNS (modo leitura)
# =========================================================


def values_only(queryset, *fields):
    """
    Retorna dicionários ao invés de objetos.
    Ideal para endpoints somente leitura.
    """
    return queryset.values(*fields)


# =========================================================
# COUNT SAFE (evita count pesado)
# =========================================================


def safe_count(queryset, limit=10000):
    """
    Evita contagem pesada em tabelas grandes.
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
    Applier centralizado de otimizações.

    ✔ evita N+1 queries
    ✔ reduz payload
    ✔ melhora performance
    ✔ previsível e explícito
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
