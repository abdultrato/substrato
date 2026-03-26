from typing import Dict


# Map English admin slugs to existing app labels (Portuguese).
ADMIN_SLUG_ALIASES: Dict[str, str] = {
    "equipment-integrations": "integracoes_equipamentos",
    "accounting": "contabilidade",
    "external-entities": "entidades",
    "human-resources": "recursos_humanos",
    "audit-activities": "auditoria_atividades",
    "maternity": "maternidade",
    "incidents": "ocorrencias",
    "pharmacy": "farmacia",
    "inspections": "inspecoes",
    "insurer": "seguradora",
    "equipment": "equipamentos",
    "tenants": "inquilinos",
    "payments": "pagamentos",
    "surgery": "cirurgia",
    "identity": "identidade",
    "monitoring": "monitoramento",
    "nursing": "enfermagem",
    "maintenance": "manutencoes",
    "reception": "recepcao",
    "consultations": "consultas",
    "clinical": "clinico",
    "medical-records": "prontuario",
    "billing": "faturamento",
    "notifications": "notificacoes",
}


class AdminPathAliasMiddleware:
    """
    Allow English admin URLs while keeping existing app labels/table names.

    Example:
        /admin/equipment-integrations/ -> /admin/integracoes_equipamentos/
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info
        if not path.startswith("/admin/"):
            return self.get_response(request)

        suffix = path[len("/admin/") :]

        for english_slug, app_label in ADMIN_SLUG_ALIASES.items():
            # Match slug with or without trailing content.
            if suffix == english_slug or suffix.startswith(f"{english_slug}/"):
                new_suffix = app_label + suffix[len(english_slug) :]
                new_path = "/admin/" + new_suffix
                # Update request paths so URL resolver sees the Portuguese path.
                request.path_info = new_path
                request.META["PATH_INFO"] = new_path
                # request.path is a @property (computed), but setting it
                # avoids surprises in middlewares that read it directly.
                request.path = new_path  # type: ignore[attr-defined]
                break

        return self.get_response(request)
