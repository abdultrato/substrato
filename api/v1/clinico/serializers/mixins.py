class TimestampFieldsMixin:
    """
    Inclui timestamps automaticamente no serializer.
    """

    created_at = None
    updated_at = None


class UserAuditMixin:
    """
    Campos de auditoria.
    """

    created_by = None
    updated_by = None
