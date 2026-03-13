from django.contrib.auth.models import Group, Permission
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from seguranca.permissoes import IsAdmin


class GroupViewSet(ViewSet):
    permission_classes = [IsAdmin]

    def list(self, request):
        groups = Group.objects.all().values("id", "name")
        return Response(groups)

    def retrieve(self, request, pk=None):
        group = Group.objects.filter(pk=pk).values("id", "name").first()
        permissions = Permission.objects.filter(group__id=pk).values_list("codename", flat=True)
        return Response(
            {
                "group": group,
                "permissions": list(permissions),
            }
        )

    @action(detail=True, methods=["post"])
    def add_permission(self, request, pk=None):
        group = Group.objects.get(pk=pk)
        perm_codename = request.data.get("permission")

        perm = Permission.objects.get(codename=perm_codename)
        group.permissions.add(perm)

        return Response({"status": "permission added"})

    @action(detail=True, methods=["post"])
    def remove_permission(self, request, pk=None):
        group = Group.objects.get(pk=pk)
        perm_codename = request.data.get("permission")

        perm = Permission.objects.get(codename=perm_codename)
        group.permissions.remove(perm)

        return Response({"status": "permission removed"})
