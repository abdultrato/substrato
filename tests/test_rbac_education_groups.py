from security.permissions.rbac import GROUPS, ROLE_POLICY, _normalize


def _policy_for(group_key: str) -> dict[str, frozenset[str]]:
    return ROLE_POLICY[_normalize(GROUPS[group_key])]


def test_education_management_groups_share_management_permissions():
    professor_policy = _policy_for("PROFESSOR")

    for role_key in ("DIRETOR_ESCOLA", "DIRETOR_ADJUNTO_PEDAGOGICO", "TEACHER"):
        assert _policy_for(role_key) == professor_policy


def test_education_read_groups_share_read_permissions():
    student_policy = _policy_for("ESTUDANTE")

    for role_key in ("ENCARREGADO_EDUCACAO", "STUDENT_EN"):
        assert _policy_for(role_key) == student_policy
