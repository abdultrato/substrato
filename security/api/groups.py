from django.contrib.auth.models import Group
from rest_framework.response import Response
from rest_framework.views import APIView

from security.permissions import IsAdmin


class GroupsPermissionsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        groups = Group.objects.all()

        date = []
        for group in groups:
            date.append(
                {
                    "grupo": group.name,
                    "permissoes": list(group.permissions.values_list("codename", flat=True)),
                }
            )

        return Response(date)
