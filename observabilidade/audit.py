from django.contrib.auth import get_user_model
from django.utils.timezone import now, timedelta
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

User = get_user_model()


class ActiveUsersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        last_day = now() - timedelta(days=1)

        users = User.objects.filter(last_login__gte=last_day).values("id", "username", "last_login")

        return Response({"active_users_last_24h": list(users)})
import logging

logger = logging.getLogger("tenant_audit")


def registrar_evento(
    usuario,
    tenant_id,
    caminho,
    metodo,
    status_code,
):
    logger.info(
        "AUDIT",
        extra={
            "usuario_id": getattr(usuario, "id", None),
            "tenant_id": tenant_id,
            "endpoint": caminho,
            "metodo": metodo,
            "status": status_code,
        }
    )
