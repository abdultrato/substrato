from rest_framework.viewsets import ModelViewSet as mvs

from .responses import created, deleted, success


class BaseModelViewSet(mvs):
    include_deleted_param = "include_deleted"

    def get_queryset(self):
        queryset = super().get_queryset()

        include_deleted = self.request.query_params.get(self.include_deleted_param)

        if include_deleted == "true" and self.request.user.is_staff:
            return self.queryset.model.all_objects.all()

        return queryset

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return success(response.data)

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        return success(response.data)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        return created(response.data)

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        return success(response.data, "atualizado com sucesso")

    def destroy(self, request, *args, **kwargs):
        super().destroy(request, *args, **kwargs)
        return deleted()
