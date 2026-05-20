from __future__ import annotations

from typing import Any

from apps.ai_assistant.services.policy import AiPolicyGuard

from .base import AiTool, AiToolContext
from .resource_catalog import accessible_resources_for_user, descriptors_by_module


class GetUserContextTool(AiTool):
    name = "get_user_context"
    description_pt = "Identifica o utilizador autenticado e resume que áreas pode investigar com a IA."
    description_en = "Identifies the authenticated user and summarizes which areas they can investigate with AI."
    required_groups: tuple[str, ...] = ()
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        user = context.user
        tenant = context.tenant
        policy = AiPolicyGuard()
        groups = sorted(policy.user_group_names(user))
        resources = accessible_resources_for_user(user)
        modules = descriptors_by_module(resources)

        username = getattr(user, "get_username", lambda: getattr(user, "username", ""))()
        full_name = ""
        if hasattr(user, "get_full_name"):
            full_name = (user.get_full_name() or "").strip()

        tenant_name = getattr(tenant, "name", "") or getattr(tenant, "identifier", "") or ""
        tenant_identifier = getattr(tenant, "identifier", "") or ""

        prompt_pt = (
            "Diga-me o que quer investigar: clínico, enfermagem, financeiro, farmácia, educação, "
            "erros/monitorização, auditoria, recursos humanos ou outro módulo a que tenha acesso."
        )
        prompt_en = (
            "Tell me what you want to investigate: clinical, nursing, finance, pharmacy, education, "
            "errors/monitoring, audit, human resources or another module you can access."
        )

        return {
            "summary": {
                "title_pt": "Contexto pessoal do utilizador",
                "title_en": "User personal context",
                "metrics": [
                    {"label_pt": "Login", "label_en": "Login", "value": username or "—"},
                    {"label_pt": "Tenant", "label_en": "Tenant", "value": tenant_name or "—"},
                    {"label_pt": "Grupos", "label_en": "Groups", "value": ", ".join(groups) or "—"},
                    {
                        "label_pt": "Perfil administrativo",
                        "label_en": "Administrative profile",
                        "value": "sim" if policy.is_admin_like(user) else "não",
                    },
                    {
                        "label_pt": "Módulos investigáveis",
                        "label_en": "Investigable modules",
                        "value": len(modules),
                    },
                ],
                "user": {
                    "id": getattr(user, "id", None),
                    "login": username,
                    "name": full_name,
                    "email": getattr(user, "email", "") or "",
                    "is_staff": bool(getattr(user, "is_staff", False)),
                    "is_superuser": bool(getattr(user, "is_superuser", False)),
                    "groups": groups,
                },
                "tenant": {
                    "id": getattr(tenant, "id", None),
                    "name": tenant_name,
                    "identifier": tenant_identifier,
                },
                "accessible_modules": modules,
                "investigation_prompt_pt": prompt_pt,
                "investigation_prompt_en": prompt_en,
            },
            "sources": [
                {"type": "model", "label": "User", "href": "/api/v1/identity/user/"},
                {"type": "model", "label": "Tenant", "href": "/api/v1/tenants/tenant/"},
                {"type": "policy", "label": "RBAC", "href": ""},
            ],
        }
