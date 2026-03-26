class SerializerContextMixin:
    def get_serializer_context(self):
        base_get_context = getattr(super(), "get_serializer_context", None)
        # Fall back to an empty context if the parent does not implement it.
        context = base_get_context() if callable(base_get_context) else {}
        request = getattr(self, "request", None)
        context.setdefault("request_user", getattr(request, "user", None))
        context.setdefault("request_tenant", getattr(request, "tenant", None))
        return context
