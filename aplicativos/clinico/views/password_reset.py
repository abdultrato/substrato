from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.sessions.models import Session
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from frontend.api.accounts.models.password_reset import PasswordResetToken as prt

User = get_user_model()


# =========================================================
# SOLICITAR RECUPERAÇÃO
# =========================================================


class PasswordResetRequestView(APIView):
    """
    Solicita redefinição de senha.
    Sempre retorna resposta neutra.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response(
                {"error": "Email é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email__iexact=email).first()

        if user:
            # invalida tokens antigos
            prt.objects.filter(user=user, usado=False).update(usado=True)

            token = prt.objects.create(user=user)

            reset_link = f"{settings.FRONTEND_URL}/reset-password/{token.token}"

            send_mail(
                subject="Recuperação de senha",
                message=f"Use o link para redefinir sua senha:\n{reset_link}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )

        return Response({"message": "Se o email existir, enviaremos instruções."})


# =========================================================
# CONFIRMAR NOVA SENHA
# =========================================================


class PasswordResetConfirmView(APIView):
    """
    Redefine senha utilizando token seguro.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        password = request.data.get("password")
        password_confirm = request.data.get("password_confirm")

        if not all([token, password, password_confirm]):
            return Response(
                {"error": "Dados incompletos"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != password_confirm:
            return Response(
                {"error": "As senhas não coincidem"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reset = prt.objects.filter(token=token, usado=False).first()

        if not reset or reset.expirado():
            return Response(
                {"error": "Token inválido ou expirado"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validate_password(password)

        user = reset.user
        user.password = make_password(password)
        user.save(update_fields=["password"])

        # invalida todas as sessões ativas
        Session.objects.filter(expire_date__gte=timezone.now()).delete()

        reset.usado = True
        reset.save(update_fields=["usado"])

        return Response({"message": "Senha redefinida com sucesso"})
