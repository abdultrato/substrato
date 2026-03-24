import logging

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import BadHeaderError, send_mail
from django.core.validators import validate_email
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class EmailTestView(APIView):
    """
    Endpoint para teste de envio de email.
    Acesso restrito a administradores.
    """

    permission_classes = [IsAdminUser]

    def post(self, request):
        to_email = request.data.get("email")

        if not to_email:
            return Response(
                {"error": "Email é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # valida formato do email
        try:
            validate_email(to_email)
        except ValidationError:
            return Response(
                {"error": "Email inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            send_mail(
                subject="Teste de Email",
                message="Sistema operacional.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=False,
            )

        except BadHeaderError:
            logger.warning("Tentativa de header injection detectada.")
            return Response(
                {"error": "Cabeçalho inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as exc:
            logger.exception("Falha ao enviar email.")
            return Response(
                {"error": "Falha ao enviar email.", "details": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"status": "email enviado com sucesso"},
            status=status.HTTP_200_OK,
        )
