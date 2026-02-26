from rest_framework import permissions
from .base import BaseRolePermission


# ============================================
# ADMINISTRADOR
# ============================================


class IsAdmin(BaseRolePermission):
    """
    Acesso total ao sistema.
    """

    group_name = "Administrador"


# ============================================
# RECEPCIONISTA
# ============================================


class IsRecepcionista(BaseRolePermission):
    """
    Pode:
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
    Pode:
    - gerir resultados
    - visualizar requisições
    - visualizar faturas
    """

    group_name = "Técnico de Laboratório"
    allowed_basename = ["resultadoitem", "requisicao", "fatura"]
    allowed_methods = ["GET", "POST", "PUT", "PATCH", "HEAD", "OPTIONS"]


# ============================================
# TÉCNICO DE FARMÁCIA
# ============================================


class IsPharmacyTech(BaseRolePermission):
    """
    Pode gerir estoque.
    """

    group_name = "Técnico de Farmácia"
    allowed_basename = ["estoque"]


# ============================================
# ENFERMEIRO
# ============================================


class IsNurse(BaseRolePermission):
    """
    Pode visualizar:
    - pacientes
    - requisições
    - resultados
    """

    group_name = "Enfermeiro"
    allowed_basename = ["paciente", "requisicao", "resultadoitem"]
    allowed_methods = ["GET", "HEAD", "OPTIONS"]


# ============================================
# TÉCNICO ADMINISTRATIVO
# ============================================


class IsAdminTech(BaseRolePermission):
    """
    Pode:
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
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return user.groups.filter(
            name__in=["Administrador", "Técnico Administrativo"]
        ).exists()
