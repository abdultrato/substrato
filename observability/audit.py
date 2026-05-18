import logging

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


logger = logging.getLogger("tenant_audit")


def register_event(
    user,
    tenant_id,
    path,
    method,
    status_code,
):
    logger.info(
        "AUDIT",
        extra={
            "user_id": getattr(user, "id", None),
            "tenant_id": tenant_id,
            "endpoint": path,
            "method": method,
            "status": status_code,
        },
    )


registrar_evento = register_event
"""Registro de eventos de auditoria para monitoramento e trilha."""


def register_cloud_event(
    *,
    action: str,
    status: str,
    source_cluster_id: str | None = None,
    target_cluster_id: str | None = None,
    deployment_id: str | None = None,
    details: dict | None = None,
):
    logger.info(
        "AUDIT_CLOUD",
        extra={
            "action": action,
            "status": status,
            "source_cluster_id": source_cluster_id,
            "target_cluster_id": target_cluster_id,
            "deployment_id": deployment_id,
            "details": details or {},
        },
    )
