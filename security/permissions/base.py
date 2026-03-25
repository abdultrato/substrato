import logging

from rest_framework import permissions

logger = logging.getLogger("security.permissions")


def tenant_matches_request(request, user) -> bool:
    """
    Defesa multi-tenant:
    - Se o middleware definiu `request.tenant`, o usuário autenticado deve pertencer ao mesmo tenant.
    - Superusers fazem bypass (controle feito no caller).
    - Se não for possível determinar tenant (ex.: request sem tenant), não bloqueia.
    """

    req_tenant = getattr(request, "tenant", None)
    req_tenant_id = getattr(req_tenant, "id", None)
    if req_tenant_id is None:
        return True

    user_tenant_id = getattr(user, "tenant_id", None)
    if user_tenant_id is None:
        user_tenant = getattr(user, "tenant", None)
        user_tenant_id = getattr(user_tenant, "id", None)

    if user_tenant_id is None:
        return True

    return req_tenant_id == user_tenant_id


class BaseRolePermission(permissions.BasePermission):
    """
    Permissão base para controle por grupo.

    - Superuser sempre tem acesso
    - Pode restringir por grupo
    - Pode restringir por basename (router)
    - Pode restringir por método HTTP
    """

    group_name: str | None = None
    allowed_basename: list[str] | None = None
    allowed_methods: list[str] | None = None

    def has_permission(self, request, view):

        try:
            user = getattr(request, "user", None)

            # Segurança defensiva
            if not user:
                logger.warning("request_sem_user")
                return False

            # Superuser bypass total
            if getattr(user, "is_superuser", False):
                return True

            # Autenticação obrigatória
            if not user.is_authenticated:
                logger.info("user_nao_autenticado")
                return False

            # Tenant isolation: token de um tenant não deve operar noutro tenant via Host header.
            if not tenant_matches_request(request, user):
                logger.info(
                    "tenant_mismatch",
                    extra={
                        "user_id": getattr(user, "id", None),
                        "user_tenant_id": getattr(user, "tenant_id", None),
                        "request_tenant_id": getattr(getattr(request, "tenant", None), "id", None),
                    },
                )
                return False

            # Verificação de grupo
            if self.group_name:
                pertence = user.groups.filter(name=self.group_name).exists()

                if not pertence:
                    logger.info(
                        "grupo_nao_autorizado",
                        extra={"grupo_necessario": self.group_name},
                    )
                    return False

            # Verificação de basename (ViewSet)
            if self.allowed_basename:
                basename = getattr(view, "basename", None)

                if not basename:
                    logger.warning("view_sem_basename")
                    return False

                if basename not in self.allowed_basename:
                    logger.info(
                        "basename_nao_autorizado",
                        extra={"basename": basename},
                    )
                    return False

            # Verificação de método HTTP
            if self.allowed_methods:
                method = request.method.upper()

                if method not in self.allowed_methods:
                    logger.info(
                        "method_nao_permitido",
                        extra={"method": method},
                    )
                    return False

            return True

        except Exception as error:
            logger.exception(
                "error_verificacao_permissao",
                extra={"error": str(error)},
            )
            return False
