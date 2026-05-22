from __future__ import annotations

from collections.abc import Iterable

from django.db.models import Q, QuerySet

from security.permissions.rbac import GROUPS


def _normalize(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return ""
    return (
        value.replace("á", "a")
        .replace("à", "a")
        .replace("â", "a")
        .replace("ã", "a")
        .replace("é", "e")
        .replace("ê", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ô", "o")
        .replace("õ", "o")
        .replace("ú", "u")
        .replace("ç", "c")
    )


ADMIN_GROUP = _normalize(GROUPS["ADMIN"])
DIRECTOR_GROUP = _normalize(GROUPS["DIRETOR_ESCOLA"])
DEPUTY_GROUP = _normalize(GROUPS["DIRETOR_ADJUNTO_PEDAGOGICO"])
TEACHER_GROUPS = {_normalize(GROUPS["PROFESSOR"]), _normalize(GROUPS["TEACHER"])}
STUDENT_GROUPS = {_normalize(GROUPS["ESTUDANTE"]), _normalize(GROUPS["STUDENT_EN"])}


def normalized_user_groups(user) -> set[str]:
    if not user or not getattr(user, "is_authenticated", False):
        return set()
    try:
        names = user.groups.values_list("name", flat=True)
    except Exception:
        return set()
    return {_normalize(name) for name in names if name}


def normalized_group_names(values: Iterable[str]) -> set[str]:
    return {_normalize(v) for v in values if v}


def is_admin_user(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    return ADMIN_GROUP in normalized_user_groups(user)


def is_director_user(user) -> bool:
    return DIRECTOR_GROUP in normalized_user_groups(user)


def is_deputy_user(user) -> bool:
    return DEPUTY_GROUP in normalized_user_groups(user)


def is_teacher_user(user) -> bool:
    return bool(normalized_user_groups(user) & TEACHER_GROUPS)


def is_student_groups(groups: set[str]) -> bool:
    return bool(groups & STUDENT_GROUPS)


def can_assign_groups(actor, target_group_names: set[str]) -> bool:
    if not target_group_names:
        return True
    if is_admin_user(actor):
        return True
    if ADMIN_GROUP in target_group_names:
        return False
    if is_director_user(actor):
        return True
    if is_deputy_user(actor):
        return DIRECTOR_GROUP not in target_group_names
    if is_teacher_user(actor):
        return target_group_names.issubset(STUDENT_GROUPS)
    return False


def can_manage_target_user(actor, target) -> bool:
    if not actor or not target:
        return False
    if getattr(actor, "pk", None) == getattr(target, "pk", None):
        return True
    if is_admin_user(actor):
        return True
    if is_admin_user(target):
        return False

    target_groups = normalized_user_groups(target)
    if is_director_user(actor):
        return True
    if is_deputy_user(actor):
        return DIRECTOR_GROUP not in target_groups
    if is_teacher_user(actor):
        return is_student_groups(target_groups)
    return False


def manageable_users_queryset(actor, queryset: QuerySet):
    if not actor or not getattr(actor, "is_authenticated", False):
        return queryset.none()

    if is_admin_user(actor):
        return queryset

    base = queryset.exclude(is_superuser=True).exclude(groups__name=GROUPS["ADMIN"])
    if is_director_user(actor):
        return base.distinct()
    if is_deputy_user(actor):
        return base.exclude(groups__name=GROUPS["DIRETOR_ESCOLA"]).distinct()
    if is_teacher_user(actor):
        student_group_names = [GROUPS["ESTUDANTE"], GROUPS["STUDENT_EN"]]
        return base.filter(groups__name__in=student_group_names).distinct()

    return queryset.filter(Q(pk=getattr(actor, "pk", None))).distinct()
