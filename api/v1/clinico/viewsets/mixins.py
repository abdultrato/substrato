from rest_framework.response import Response


class SoftDeleteMixin:
    """
    Soft delete corporativo.
    Requer campo 'ativo'.
    """

    def perform_destroy(self, instance):
        if hasattr(instance, "ativo"):
            instance.ativo = False
            instance.save(update_fields=["ativo"])
        else:
            instance.delete()


class BulkCreateMixin:
    """
    Criação em massa.
    """

    def create(self, request, *args, **kwargs):
        many = isinstance(request.data, list)
        serializer = self.get_serializer(data=request.data, many=many)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data)
