from django.core.exceptions import FieldDoesNotExist


def _has_model_field(serializer, field_name: str) -> bool:
    meta = getattr(serializer, "Meta", None)
    model = getattr(meta, "model", None)
    if model is None or not field_name:
        return False
    try:
        model._meta.get_field(field_name)
        return True
    except FieldDoesNotExist:
        return False
    except Exception:
        return False


class AuditMixin:
    def _build_audit_kwargs(self, serializer):
        user = getattr(getattr(self, "request", None), "user", None)
        if not getattr(user, "is_authenticated", False):
            return {}

        audit_kwargs = {}
        instance = getattr(serializer, "instance", None)
        fields = getattr(serializer, "fields", {}) or {}

        has_created_field = "created_by" in fields or _has_model_field(serializer, "created_by")
        has_updated_field = "updated_by" in fields or _has_model_field(serializer, "updated_by")

        if instance is None and has_created_field:
            audit_kwargs["created_by"] = user
        if has_updated_field:
            audit_kwargs["updated_by"] = user

        return audit_kwargs

    def perform_create(self, serializer):
        audit_kwargs = self._build_audit_kwargs(serializer)
        if audit_kwargs:
            try:
                serializer.save(**audit_kwargs)
                return
            except TypeError:
                # Serializer create signature may not accept extra kwargs.
                pass
        super().perform_create(serializer)

    def perform_update(self, serializer):
        audit_kwargs = self._build_audit_kwargs(serializer)
        if audit_kwargs:
            try:
                serializer.save(**audit_kwargs)
                return
            except TypeError:
                # Serializer update signature may not accept extra kwargs.
                pass
        super().perform_update(serializer)
