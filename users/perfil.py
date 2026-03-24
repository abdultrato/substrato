from rest_framework.permissions import IsAuthenticated as autenticado
from rest_framework.response import Response
from rest_framework.views import APIView


class UserProfileView(APIView):
    permission_classes = [autenticado]

    def get(self, request):
        user = request.user

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "groups": list(user.groups.values_list("name", flat=True)),
            }
        )
