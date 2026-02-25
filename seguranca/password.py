from django.contrib.auth.password_validation import validate_password
from rest_framework import status
from rest_framework.permissions import IsAuthenticated as autenticado
from rest_framework.response import Response
from rest_framework.views import APIView


class ChangePasswordView(APIView):
    permission_classes = [autenticado]

    def post(self, request):
        user = request.user
        password = request.data.get("password")

        if not password:
            return Response(
                {"error": "Nova senha é obrigatória."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validate_password(password, user)

        user.set_password(password)
        user.save()

        return Response({"detail": "Senha alterada com sucesso."})
