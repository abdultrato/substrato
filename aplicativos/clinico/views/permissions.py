from rest_framework.permissions import BasePermission as bp


def is_in_group(user, group_name: str) -> bool:
    return user.groups.filter(name=group_name).exists()


def is_admin(user) -> bool:
    return user.is_superuser or user.is_staff or is_in_group(user, "Administrador")


# =====================================================
# ADMIN
# =====================================================


class IsAdmin(bp):
    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and is_admin(user)


# =====================================================
# TÉCNICO ADMINISTRATIVO
# =====================================================


class IsAdminTech(bp):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False

        if is_admin(user):
            return True

        return is_in_group(user, "Técnico Administrativo")


# =====================================================
# RECEPCIONISTA
# =====================================================


class IsRecepcionista(bp):
    def has_permission(self, request, view):
        user = request.user

        if not user.is_authenticated:
            return False

        if is_admin(user):
            return True

        if is_in_group(user, "Recepcionista"):
            if view.basename in ["paciente", "requisicao"]:
                return True

            if view.basename == "fatura" and request.method in [
                "GET",
                "HEAD",
                "OPTIONS",
            ]:
                return True

        return False


# =====================================================
# ENFERMEIRO
# =====================================================


class IsNurse(bp):
    def has_permission(self, request, view):
        user = request.user

        if not user.is_authenticated:
            return False

        if is_admin(user):
            return True

        if is_in_group(user, "Enfermeiro"):
            return view.basename in [
                "paciente",
                "requisicao",
                "resultadoitem",
            ] and request.method in ["GET", "HEAD", "OPTIONS"]

        return False


# =====================================================
# TÉCNICO DE LABORATÓRIO
# =====================================================


class IsLabTechnician(bp):
    def has_permission(self, request, view):
        user = request.user

        if not user.is_authenticated:
            return False

        if is_admin(user):
            return True

        if is_in_group(user, "Técnico de Laboratório"):
            if view.basename == "resultadoitem":
                return True

            if view.basename in ["requisicao", "fatura"] and request.method in [
                "GET",
                "HEAD",
                "OPTIONS",
            ]:
                return True

        return False


# =====================================================
# FARMÁCIA
# =====================================================


class IsPharmacyTech(bp):
    def has_permission(self, request, view):
        user = request.user

        if not user.is_authenticated:
            return False

        if is_admin(user):
            return True

        return is_in_group(user, "Técnico de Farmácia")


# =====================================================
# MÉDICO
# =====================================================


class IsMedico(bp):
    def has_permission(self, request, view):
        user = request.user

        if not user.is_authenticated:
            return False

        if is_admin(user):
            return True

        return is_in_group(user, "Médico")


# =====================================================
# TÉCNICO DE LIMPEZA
# =====================================================


class IsCleaningTech(bp):
    def has_permission(self, request, view):
        user = request.user

        if not user.is_authenticated:
            return False

        if is_admin(user):
            return True

        return is_in_group(user, "Técnico de Limpeza")
