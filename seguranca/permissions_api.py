from django.contrib.auth.models import Group
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


class GroupsPermissionsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        groups = Group.objects.all()

        data = []

        for group in groups:
            data.append(
                {
                    "grupo": group.name,
                    "permissoes": list(group.permissions.values_list("codename", flat=True)),
                }
            )

        return Response(data)
