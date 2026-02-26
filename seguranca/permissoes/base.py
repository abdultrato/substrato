import logging
from rest_framework import permissions

logger = logging.getLogger("seguranca.permissoes")


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
                logger.warning("request_sem_usuario")
                return False

            # Superuser bypass total
            if getattr(user, "is_superuser", False):
                return True

            # Autenticação obrigatória
            if not user.is_authenticated:
                logger.info("usuario_nao_autenticado")
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
                metodo = request.method.upper()

                if metodo not in self.allowed_methods:
                    logger.info(
                        "metodo_nao_permitido",
                        extra={"metodo": metodo},
                    )
                    return False

            return True

        except Exception as erro:
            logger.exception(
                "erro_verificacao_permissao",
                extra={"erro": str(erro)},
            )
            return False
