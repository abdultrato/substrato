from __future__ import annotations

from django.apps import apps
from django.contrib import admin
from django.core.exceptions import FieldDoesNotExist
from django.db import models

LOCAL_APP_PREFIX = "apps."
MAX_LIST_DISPLAY_FIELDS = 7
MAX_SEARCH_FIELDS = 8
MAX_LIST_FILTER_FIELDS = 6
MAX_SELECT_RELATED_FIELDS = 8


class SafeAutoModelAdmin(admin.ModelAdmin):
    """Conservative fallback Admin for models without a custom ModelAdmin."""

    actions: list[str] = []
    list_per_page = 50
    save_on_top = True
    show_full_result_count = False

    @admin.display(description="Objeto")
    def object_label(self, obj):
        return str(obj)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        select_related_fields = [
            field.name
            for field in self.model._meta.fields
            if isinstance(field, (models.ForeignKey, models.OneToOneField))
            and not getattr(field.remote_field, "parent_link", False)
        ][:MAX_SELECT_RELATED_FIELDS]
        if select_related_fields:
            return queryset.select_related(*select_related_fields)
        return queryset


def register_unregistered_local_models(admin_site: admin.AdminSite | None = None) -> list[str]:
    """Register local app models that were not explicitly exposed in Django Admin."""

    site = admin_site or admin.site
    registered_labels: list[str] = []

    for model in apps.get_models():
        if model in site._registry:
            continue
        if not model._meta.app_config.name.startswith(LOCAL_APP_PREFIX):
            continue
        if model._meta.proxy:
            continue

        admin_class = _build_admin_class(model)
        site.register(model, admin_class)
        registered_labels.append(model._meta.label)

    return registered_labels


def _build_admin_class(model: type[models.Model]) -> type[SafeAutoModelAdmin]:
    attrs = {
        "__module__": __name__,
        "list_display": _list_display_fields(model),
        "search_fields": _search_fields(model),
        "list_filter": _list_filter_fields(model),
        "raw_id_fields": _raw_id_fields(model),
        "readonly_fields": _readonly_fields(model),
    }

    date_hierarchy = _date_hierarchy(model)
    if date_hierarchy:
        attrs["date_hierarchy"] = date_hierarchy

    return type(f"{model.__name__}AutoAdmin", (SafeAutoModelAdmin,), attrs)


def _list_display_fields(model: type[models.Model]) -> tuple[str, ...]:
    preferred = (
        "custom_id",
        "id",
        "name",
        "code",
        "number",
        "title",
        "status",
        "tenant",
        "created_at",
        "updated_at",
    )
    concrete_names = {field.name for field in model._meta.concrete_fields}
    fields: list[str] = [name for name in preferred if name in concrete_names]

    for field in model._meta.concrete_fields:
        if len(fields) >= MAX_LIST_DISPLAY_FIELDS:
            break
        if field.name in fields:
            continue
        if isinstance(field, (models.BinaryField, models.JSONField, models.TextField)):
            continue
        fields.append(field.name)

    return tuple(fields[:MAX_LIST_DISPLAY_FIELDS]) or ("object_label",)


def _search_fields(model: type[models.Model]) -> tuple[str, ...]:
    searchable_types = (
        models.CharField,
        models.EmailField,
        models.SlugField,
        models.TextField,
    )
    fields: list[str] = []
    for field in model._meta.concrete_fields:
        if isinstance(field, searchable_types):
            fields.append(field.name)
        if len(fields) >= MAX_SEARCH_FIELDS:
            break
    return tuple(fields)


def _list_filter_fields(model: type[models.Model]) -> tuple[str, ...]:
    filterable_types = (
        models.BooleanField,
        models.DateField,
        models.DateTimeField,
    )
    preferred = ("status", "tenant", "created_at", "updated_at", "is_active", "deleted_at")
    concrete_fields = {field.name: field for field in model._meta.concrete_fields}
    fields: list[str] = []

    for name in preferred:
        field = concrete_fields.get(name)
        if field and _is_filterable(field):
            fields.append(name)

    for field in model._meta.concrete_fields:
        if len(fields) >= MAX_LIST_FILTER_FIELDS:
            break
        if field.name in fields:
            continue
        if field.choices or isinstance(field, filterable_types):
            fields.append(field.name)

    return tuple(fields[:MAX_LIST_FILTER_FIELDS])


def _is_filterable(field: models.Field) -> bool:
    return bool(
        field.choices
        or isinstance(field, (models.ForeignKey, models.BooleanField, models.DateField, models.DateTimeField))
    )


def _raw_id_fields(model: type[models.Model]) -> tuple[str, ...]:
    names: list[str] = []
    for field in model._meta.get_fields():
        if getattr(field, "auto_created", False) and not getattr(field, "concrete", False):
            continue
        if isinstance(field, (models.ForeignKey, models.OneToOneField)) and getattr(
            field.remote_field, "parent_link", False
        ):
            continue
        if isinstance(field, (models.ForeignKey, models.OneToOneField, models.ManyToManyField)):
            names.append(field.name)
    return tuple(names)


def _readonly_fields(model: type[models.Model]) -> tuple[str, ...]:
    return tuple(
        field.name
        for field in model._meta.concrete_fields
        if not getattr(field, "editable", True) or getattr(field, "auto_created", False)
    )


def _date_hierarchy(model: type[models.Model]) -> str | None:
    for name in ("created_at", "updated_at", "date", "created_on"):
        field = _field_by_name(model, name)
        if isinstance(field, (models.DateField, models.DateTimeField)):
            return name
    return None


def _field_by_name(model: type[models.Model], name: str) -> models.Field | None:
    try:
        return model._meta.get_field(name)
    except FieldDoesNotExist:
        return None
