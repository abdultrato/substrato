from __future__ import annotations

from rest_framework.exceptions import PermissionDenied


def user_has_laboratory_result_privilege(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True

    try:
        from security.permissions.rbac import GROUPS as RBAC_GROUPS, _normalize

        raw_groups = list(user.groups.values_list("name", flat=True))
        user_groups = {_normalize(group) for group in raw_groups if group}
        allowed = {
            _normalize(RBAC_GROUPS["ADMIN"]),
            _normalize(RBAC_GROUPS["LABORATORIO"]),
        }
        return bool(user_groups & allowed)
    except Exception:
        return False


def ensure_laboratory_result_privilege(user) -> None:
    if not user_has_laboratory_result_privilege(user):
        raise PermissionDenied("Requer Técnico de Laboratório ou Administrador.")
