from security.permissions.rbac import GROUPS, ROLE_POLICY, _normalize


def _policy_for(group_key: str) -> dict[str, frozenset[str]]:
    return ROLE_POLICY[_normalize(GROUPS[group_key])]


def test_education_management_groups_share_management_permissions():
    professor_policy = _policy_for("PROFESSOR")
    assert "education-random_test" in professor_policy

    for role_key in ("DIRETOR_ESCOLA", "DIRETOR_ADJUNTO_PEDAGOGICO", "TEACHER"):
        assert _policy_for(role_key) == professor_policy


def test_education_read_groups_share_read_permissions():
    student_policy = _policy_for("ESTUDANTE")
    student_en_policy = _policy_for("STUDENT_EN")
    guardian_policy = _policy_for("ENCARREGADO_EDUCACAO")

    assert student_en_policy == student_policy
    assert guardian_policy != student_policy
