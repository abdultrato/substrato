import logging

from rest_framework import permissions

logger = logging.getLogger("seguranca.permissoes")


# ============================================
# BASE PERMISSION (NÚCLEO)
# ============================================
class BaseRolePermission(permissions.BasePermission):
    """
    Permissão base para controle por grupo.
    Superuser sempre tem acesso.
    """

    group_name: str | None = None
    allowed_basename: list[str] | None = None
    allowed_methods: list[str] | None = None

    def has_permission(self, request, view):
        try:
            user = getattr(request, "user", None)

            # proteção contra request malformado
            if user is None:
                logger.warning("Permissão negada: request sem usuário.")
                return False

            # superuser sempre autorizado
            if getattr(user, "is_superuser", False):
                return True

            # usuário não autenticado
            if not getattr(user, "is_authenticated", False):
                logger.info("Permissão negada: usuário não autenticado.")
                return False

            # verificação de grupo
            if self.group_name:
                try:
                    pertence = user.groups.filter(name=self.group_name).exists()
                    if not pertence:
                        logger.info(
                            "Permissão negada: usuário não pertence ao grupo.",
                            extra={"grupo_necessario": self.group_name},
                        )
                        return False
                except Exception as erro:
                    logger.error(
                        "Falha ao verificar grupo do usuário.",
                        extra={"erro": str(erro)},
                    )
                    return False

            # basename pode não existir dependendo do router
            if self.allowed_basename:
                basename = getattr(view, "basename", None)

                if basename is None:
                    logger.warning("Permissão negada: view sem basename definido.")
                    return False

                if basename not in self.allowed_basename:
                    logger.info(
                        "Permissão negada: módulo não autorizado.",
                        extra={"basename": basename},
                    )
                    return False

            # verificação de métodos HTTP
            if self.allowed_methods:
                metodo = getattr(request, "method", "").upper()

                if metodo not in self.allowed_methods:
                    logger.info(
                        "Permissão negada: método HTTP não permitido.",
                        extra={"metodo": metodo},
                    )
                    return False

            return True

        except Exception as erro:
            logger.exception(
                "Erro inesperado durante verificação de permissões.",
                extra={"erro": str(erro)},
            )
            return False


# ============================================
# ADMINISTRADOR
# ============================================
class IsAdmin(BaseRolePermission):
    """Acesso total ao sistema."""

    group_name = "Administrador"


# ============================================
# RECEPCIONISTA
# ============================================
class IsRecepcionista(BaseRolePermission):
    """
    Recepcionista pode:
    - gerir pacientes
    - gerir requisições
    - visualizar faturas
    """

    group_name = "Recepcionista"
    allowed_basename = ["paciente", "requisicao", "fatura"]
    allowed_methods = ["GET", "POST", "PUT", "PATCH", "HEAD", "OPTIONS"]


# ============================================
# TÉCNICO DE LABORATÓRIO
# ============================================
class IsLabTechnician(BaseRolePermission):
    """
    Técnico de laboratório:
    - gerir resultados
    - visualizar requisições e faturas
    """

    group_name = "Técnico de Laboratório"
    allowed_basename = ["resultadoitem", "requisicao", "fatura"]
    allowed_methods = ["GET", "POST", "PUT", "PATCH", "HEAD", "OPTIONS"]


# ============================================
# TÉCNICO DE FARMÁCIA
# ============================================
class IsPharmacyTech(BaseRolePermission):
    """Técnico de farmácia pode gerir estoque."""

    group_name = "Técnico de Farmácia"
    allowed_basename = ["estoque"]


# ============================================
# ENFERMEIRO
# ============================================
class IsNurse(BaseRolePermission):
    """
    Enfermeiro pode visualizar pacientes,
    requisições e resultados.
    """

    group_name = "Enfermeiro"
    allowed_basename = ["paciente", "requisicao", "resultadoitem"]
    allowed_methods = ["GET", "HEAD", "OPTIONS"]


# ============================================
# TÉCNICO ADMINISTRATIVO
# ============================================
class IsAdminTech(BaseRolePermission):
    """
    Técnico administrativo:
    - visualizar faturas
    - gerir entidades
    """

    group_name = "Técnico Administrativo"
    allowed_basename = ["fatura", "entidade"]
    allowed_methods = ["GET", "HEAD", "OPTIONS"]


# ============================================
# PERMISSÃO COMBINADA ADMINISTRATIVA
# ============================================
class IsAdministrativeStaff(permissions.BasePermission):
    """
    Permite acesso a:
    - Administrador
    - Técnico Administrativo
    """

    def has_permission(self, request, view):
        try:
            user = getattr(request, "user", None)

            if user is None:
                logger.warning("Permissão negada: request sem usuário.")
                return False

            if getattr(user, "is_superuser", False):
                return True

            if not getattr(user, "is_authenticated", False):
                logger.info("Permissão negada: usuário não autenticado.")
                return False

            try:
                autorizado = user.groups.filter(
                    name__in=["Administrador", "Técnico Administrativo"]
                ).exists()

                if not autorizado:
                    logger.info("Permissão negada: usuário sem grupo administrativo.")

                return autorizado

            except Exception as erro:
                logger.error(
                    "Erro ao verificar grupos administrativos.",
                    extra={"erro": str(erro)},
                )
                return False

        except Exception as erro:
            logger.exception(
                "Erro inesperado na verificação administrativa.",
                extra={"erro": str(erro)},
            )
            return False
