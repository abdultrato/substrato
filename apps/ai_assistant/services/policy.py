from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from typing import Iterable

from security.permissions.rbac import GROUPS as RBAC_GROUPS


def normalize_group(value: str) -> str:
    value = (value or "").strip().lower()
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn")


@dataclass(slots=True)
class AiPolicyError(Exception):
    policy_key: str
    reason: str
    blocked: bool = True

    def __str__(self) -> str:
        return self.reason


class AiPolicyGuard:
    """Centraliza tenant, RBAC e confirmação de acções da IA."""

    admin_group = RBAC_GROUPS["ADMIN"]

    def user_group_names(self, user) -> set[str]:
        try:
            return {str(name) for name in user.groups.values_list("name", flat=True) if name}
        except Exception:
            return set()

    def normalized_user_groups(self, user) -> set[str]:
        return {normalize_group(name) for name in self.user_group_names(user)}

    def is_admin_like(self, user) -> bool:
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "is_superuser", False):
            return True
        return normalize_group(self.admin_group) in self.normalized_user_groups(user)

    def ensure_chat_allowed(self, *, user, tenant) -> None:
        if not user or not getattr(user, "is_authenticated", False):
            raise AiPolicyError("authentication_required", "Autenticação obrigatória para usar a IA.")
        if tenant is None:
            raise AiPolicyError("tenant_required", "Tenant não resolvido na requisição.")

        request_tenant_id = getattr(tenant, "id", None)
        user_tenant_id = getattr(user, "tenant_id", None)
        if not getattr(user, "is_superuser", False) and user_tenant_id and request_tenant_id and user_tenant_id != request_tenant_id:
            raise AiPolicyError("tenant_mismatch", "O utilizador não pertence ao tenant da requisição.")

    def can_use_tool(self, *, tool, user) -> bool:
        required_groups = tuple(getattr(tool, "required_groups", ()) or ())
        if not required_groups:
            return True
        if self.is_admin_like(user):
            return True
        user_groups = self.normalized_user_groups(user)
        required = {normalize_group(name) for name in required_groups}
        return bool(user_groups & required)

    def ensure_tool_allowed(self, *, tool, user) -> None:
        if self.can_use_tool(tool=tool, user=user):
            return
        groups = ", ".join(getattr(tool, "required_groups", ()) or ()) or "grupo autorizado"
        raise AiPolicyError(
            "tool_rbac_denied",
            f"A ferramenta {getattr(tool, 'name', 'desconhecida')} exige acesso de {groups}.",
        )

    def ensure_action_allowed(self, *, action, user, tenant) -> None:
        self.ensure_chat_allowed(user=user, tenant=tenant)
        if getattr(action, "tenant_id", None) != getattr(tenant, "id", None):
            raise AiPolicyError("action_tenant_mismatch", "A acção pertence a outro tenant.")
        if getattr(action, "status", "") not in {"pending_confirmation"}:
            raise AiPolicyError("action_not_pending", "A acção já não está pendente de confirmação.")

        owner_id = getattr(getattr(action, "session", None), "user_id", None) or getattr(action, "created_by_id", None)
        if owner_id and owner_id != getattr(user, "id", None) and not self.is_admin_like(user):
            raise AiPolicyError("action_owner_mismatch", "A acção pertence a outro utilizador.")

        if getattr(action, "requires_confirmation", True) and not self.is_admin_like(user):
            raise AiPolicyError("action_confirmation_rbac_denied", "A confirmação desta acção exige acesso administrativo.")

    def filter_allowed_tools(self, *, tools: Iterable, user) -> list:
        return [tool for tool in tools if self.can_use_tool(tool=tool, user=user)]
