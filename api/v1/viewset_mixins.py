from __future__ import annotations

from collections.abc import Iterable, Sequence
import logging

from django.core.exceptions import FieldDoesNotExist
from rest_framework.exceptions import PermissionDenied

logger = logging.getLogger(__name__)

_SEARCH_FIELD_PREFIXES = ("^", "=", "@", "$")


def _strip_search_prefix(field: str) -> str:
    # DRF SearchFilter supports prefixes to change lookup behavior.
    # We validate the underlying field path.
    while field and field[0] in _SEARCH_FIELD_PREFIXES:
        field = field[1:]
    return field


def _strip_ordering_prefix(field: str) -> str:
    # DRF OrderingFilter allows "-field" in query param; ordering_fields should be plain,
    # but we accept "-" here defensively when validating configured fields.
    return field[1:] if field.startswith("-") else field


def _iter_fields(value: object) -> list[str]:
    if value is None:
        return []
    if value == "__all__":
        return ["__all__"]
    if isinstance(value, (list, tuple)):
        return [str(v) for v in value]
    # DRF also accepts a single string for ordering_fields sometimes.
    return [str(value)]


def _resolve_field_path(model, path: str) -> bool:
    """
    Validate a Django ORM field path like:
    - "name"
    - "patient__name"

    Returns True if Django can resolve the path via model meta traversal.
    """
    if not model or not path:
        return False

    parts = path.split("__")
    current = model

    for idx, part in enumerate(parts):
        if part == "pk" and idx == len(parts) - 1:
            return True
        try:
            field = current._meta.get_field(part)
        except FieldDoesNotExist:
            return False

        if idx < len(parts) - 1:
            if not getattr(field, "is_relation", False):
                return False
            related = getattr(field, "related_model", None)
            if related is None:
                return False
            current = related

    return True


class ValidatedSearchOrderingMixin:
    """
    Mixin "enterprise" para evitar 500 causados por configuracao incorreta de
    `search_fields`/`ordering_fields`.

    - Remove campos invalidos (para nao quebrar em runtime).
    - Guarda a lista removida em `_invalid_search_fields`/`_invalid_ordering_fields`
      para ser inspecionada por testes/CI.
    """

    # Optional allowlists for annotated/virtual fields that are not part of model meta.
    extra_search_fields: Sequence[str] = ()
    extra_ordering_fields: Sequence[str] = ()

    _invalid_search_fields: list[str] = []
    _invalid_ordering_fields: list[str] = []

    @classmethod
    def _infer_model(cls):
        qs = getattr(cls, "queryset", None)
        model = getattr(qs, "model", None)
        if model is not None:
            return model

        serializer = getattr(cls, "serializer_class", None)
        meta = getattr(serializer, "Meta", None)
        return getattr(meta, "model", None)

    @classmethod
    def _validate_and_sanitize_fields(
        cls,
        *,
        model,
        fields: Iterable[str],
        strip_prefix,
        extras: Sequence[str],
        kind: str,
    ) -> tuple[list[str], list[str]]:
        invalid: list[str] = []
        valid: list[str] = []

        extras_set = set(extras or ())

        for raw in fields:
            if raw == "__all__":
                valid.append(raw)
                continue

            cleaned = strip_prefix(raw)
            if cleaned in extras_set or _resolve_field_path(model, cleaned):
                valid.append(raw)
            else:
                invalid.append(raw)

        if invalid:
            logger.warning(
                "%s: removendo campos invalidos em %s: %s",
                cls.__name__,
                kind,
                ", ".join(invalid),
            )

        return valid, invalid

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

        model = cls._infer_model()
        if model is None:
            return

        # search_fields
        raw_search = _iter_fields(getattr(cls, "search_fields", None))
        if raw_search:
            valid, invalid = cls._validate_and_sanitize_fields(
                model=model,
                fields=raw_search,
                strip_prefix=_strip_search_prefix,
                extras=getattr(cls, "extra_search_fields", ()),
                kind="search_fields",
            )
            cls.search_fields = tuple(valid)
            cls._invalid_search_fields = invalid

        # ordering_fields
        raw_ordering = _iter_fields(getattr(cls, "ordering_fields", None))
        if raw_ordering:
            # DRF supports "__all__" here.
            if raw_ordering == ["__all__"]:
                cls._invalid_ordering_fields = []
            else:
                valid, invalid = cls._validate_and_sanitize_fields(
                    model=model,
                    fields=raw_ordering,
                    strip_prefix=_strip_ordering_prefix,
                    extras=getattr(cls, "extra_ordering_fields", ()),
                    kind="ordering_fields",
                )
                cls.ordering_fields = tuple(valid)
                cls._invalid_ordering_fields = invalid


class TenantScopedQuerysetMixin:
    """
    Automatically applies `tenant` (tenant) scoping when present on the request.

    Besides filtering the queryset, it also forces the correct tenant on CREATE/UPDATE
    to avoid payload-based tenant injection (for example `{"tenant": 999}`).
    """

    tenant_field_name = "tenant"

    def initial(self, request, *args, **kwargs):
        # A autenticação do DRF corre aqui (perform_authentication), depois do
        # middleware ter posto o utilizador-corrente a None. Registamos o
        # utilizador autenticado (inclui force_authenticate em testes) para que a
        # auditoria created_by/updated_by funcione em escritas via API.
        super().initial(request, *args, **kwargs)
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            from infrastructure.context.request_user import set_current_user

            set_current_user(getattr(user, "_wrapped", user))

    def _get_request_tenant(self):
        return getattr(getattr(self, "request", None), "tenant", None)

    _get_request_tenant = _get_request_tenant

    def _get_model_from_queryset(self, qs):
        return getattr(qs, "model", None)

    def _model_has_tenant_field(self, model) -> bool:
        if model is None:
            return False
        try:
            model._meta.get_field(self.tenant_field_name)
            return True
        except FieldDoesNotExist:
            return False
        except Exception:
            return False

    def get_queryset(self):
        qs = super().get_queryset()
        tenant = self._get_request_tenant()
        if tenant is None:
            return qs

        model = self._get_model_from_queryset(qs)
        if not self._model_has_tenant_field(model):
            return qs

        return qs.filter(**{self.tenant_field_name: tenant})

    def perform_create(self, serializer):
        tenant = self._get_request_tenant()
        if tenant is None:
            return super().perform_create(serializer)

        user = getattr(getattr(self, "request", None), "user", None)
        if getattr(user, "is_superuser", False):
            return super().perform_create(serializer)

        model = getattr(getattr(serializer, "Meta", None), "model", None)
        if not self._model_has_tenant_field(model):
            return super().perform_create(serializer)

        # Force the correct tenant, ignoring any value sent by the client.
        try:
            serializer.save(**{self.tenant_field_name: tenant})
        except TypeError:
            # Serializer does not explicitly accept this field.
            super().perform_create(serializer)

    def perform_update(self, serializer):
        tenant = self._get_request_tenant()
        if tenant is None:
            return super().perform_update(serializer)

        user = getattr(getattr(self, "request", None), "user", None)
        if getattr(user, "is_superuser", False):
            return super().perform_update(serializer)

        model = getattr(getattr(serializer, "Meta", None), "model", None)
        if not self._model_has_tenant_field(model):
            return super().perform_update(serializer)

        inst = getattr(serializer, "instance", None)
        inst_tenant_id = getattr(inst, f"{self.tenant_field_name}_id", None)
        req_tenant_id = getattr(tenant, "id", None)
        if inst_tenant_id is not None and req_tenant_id is not None and inst_tenant_id != req_tenant_id:
            raise PermissionDenied("Registro de outro tenant.")

        # Block explicit tenant replacement attempts via payload.
        if self.tenant_field_name in getattr(serializer, "validated_data", {}):
            val = serializer.validated_data.get(self.tenant_field_name)
            val_id = getattr(val, "id", None) if val is not None else None
            # If a raw FK id comes through, DRF may keep it as int.
            if val_id is None and isinstance(val, int):
                val_id = val
            if req_tenant_id is not None and val_id is not None and val_id != req_tenant_id:
                raise PermissionDenied("Não é permitido alterar o tenant do record.")

        # Force the correct tenant when saving.
        try:
            serializer.save(**{self.tenant_field_name: tenant})
        except TypeError:
            super().perform_update(serializer)
