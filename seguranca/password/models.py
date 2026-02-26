from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.password_validation import validate_password
from rest_framework import status


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        senha = request.data.get("password")

        if not senha:
            return Response(
                {"error": "Nova senha é obrigatória."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validate_password(senha, user)

        user.set_password(senha)
        user.save()

        return Response({"detail": "Senha alterada com sucesso."})
