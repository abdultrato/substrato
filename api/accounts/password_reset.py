from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from rest_framework.response import Response
from rest_framework.views import APIView

User = get_user_model()


class PasswordResetConfirmView(APIView):

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        user = User.objects.filter(email=email).first()

        if not user:
            return Response({"error": "Usuário não encontrado"}, status=400)

        user.password = make_password(password)
        user.save(update_fields=["password"])

        return Response({"message": "Senha redefinida"})
