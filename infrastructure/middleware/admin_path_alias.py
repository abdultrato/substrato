"""Middleware que permite aliases adicionais para a rota do admin do Django."""

from typing import Dict


def _with_hyphen_aliases(mapping: Dict[str, str]) -> Dict[str, str]:
    """
    Add hyphen-variants for slugs that use underscores.
    Example: {"external_entities": "..."} -> also accepts "external-entities".
    """
    expanded = dict(mapping)
    for key, target in list(mapping.items()):
        if "_" in key:
            hyphen_key = key.replace("_", "-")
            expanded.setdefault(hyphen_key, target)
    return expanded


# Admin: English slugs -> existing Portuguese app labels (only when different).
ADMIN_SLUG_ALIASES: Dict[str, str] = _with_hyphen_aliases(
    {
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
        # alias para suportar /admin/clinico/... (português)
        "clinico": "clinical",
        "medical-records": "prontuario",
        "billing": "faturamento",
        "notifications": "notificacoes",
    }
)

# Admin models: English slugs -> canonical model_name.
ADMIN_MODEL_ALIASES: Dict[str, str] = _with_hyphen_aliases(
    {
        # Clinical
        "paciente": "patient",
        "exame": "labexam",
        "examecampo": "labexamfield",
        "examemedico": "medicalexam",
        "requisicaoanalise": "labrequest",
        "resultadoitem": "result",
        # External entities / billing / pharmacy
        "empresa": "company",
        "fatura": "invoice",
        "produto": "product",
        "lote": "lot",
        "movimentoestoque": "inventorymovement",
        "venda": "sale",
        "itemvenda": "saleitem",
        # Nursing
        "evolucaoenfermagem": "nursingevolution",
        "prescricaoenfermagem": "nursingprescription",
        "registroenfermagem": "nursingrecord",
        "enfermaria": "ward",
        "camaenfermaria": "wardbed",
        "internamentoenfermaria": "wardadmission",
        "procedimento": "procedure",
        "procedimentocatalogo": "procedurecatalog",
        "procedimentocatalogomaterial": "procedurecatalogmaterial",
        "procedimentoitem": "procedureitem",
        "procedimentoitemvalor": "procedureitemvalue",
        "procedimentomaterial": "procedurematerial",
        "procedimentomaterialvalor": "procedurematerialvalue",
        # Legacy aliases already used in the project
        "nursing-vital-sign": "nursingvitalsign",
        "vital-sign": "nursingvitalsign",
        "sinal-vital": "nursingvitalsign",
        "sinalvitalenfermagem": "nursingvitalsign",
        # Insurer / accounting / consultations
        "seguradora": "insurer",
        "planocobertura": "coverageplan",
        "autorizacaoprocedimento": "procedureauthorization",
        "conta": "account",
        "lancamento": "legacyentry",
        "movimento": "legacymovement",
        "conciliacaofinanceira": "financialreconciliation",
        "consulta": "medicalconsultation",
        "especialidade": "consultationspecialty",
        "feriado": "holiday",
        # Tenants / notifications / identity
        "inquilino": "tenant",
        "configuracaoinquilino": "tenantconfiguration",
        "notificacao": "notification",
        "logenvio": "deliverylog",
        "usuario": "user",
        # Medical records / maternity / surgery
        "registro": "medicalrecordentry",
        "prescricaoitem": "prescriptionitem",
        "gestacao": "pregnancy",
        "cirurgia": "surgery",
        "procedimentocirurgico": "surgicalprocedure",
        # Human resources / monitoring
        "cargo": "jobtitle",
        "funcionario": "employee",
        "agregadofamiliar": "familydependent",
        "horario": "workschedule",
        "falta": "absence",
        "ferias": "vacation",
        "dispensa": "termination",
        "horaextra": "overtime",
        "folhapagamento": "payroll",
        "erro": "systemerror",
    }
)

# API: prefix aliases (third path segment: /api/v1/<prefix>/...)
API_PREFIX_ALIASES: Dict[str, str] = _with_hyphen_aliases(
    {
        "external-entities": "external_entities",
        "human-resources": "human_resources",
        "medical-records": "medical_records",
        "equipment-integrations": "equipment_integrations",
        "cirurgia": "surgery",
    }
)

# API: model/resource aliases (fourth segment: /api/v1/<prefix>/<model>/...)
# API: model/resource aliases (fourth segment: /api/v1/<prefix>/<model>/...)
# Keep the list tight to avoid accidental rewrites; extend as needed.
API_MODEL_ALIASES: Dict[str, str] = _with_hyphen_aliases(
    {
        "company": "empresa",
        "nursing-vital-sign": "sinalvitalenfermagem",
        "vital-sign": "sinalvitalenfermagem",
        "nursing-record": "registroenfermagem",
        "family-group": "agregadofamiliar",
        "care": "atendimento",
        "activity": "atividade",
        "procedure-authorization": "autorizacaoprocedimento",
        "ward-bed": "camaenfermaria",
        "tenant-settings": "configuracaoinquilino",
        "daily-inspection": "daily_inspection",
        "dispense": "dispensa",
        "nursing-dashboard": "enfermariadashboard",
        "nursing-evolution": "evolucaoenfermagem",
        "absence": "falta",
        "tenant-feature-flag": "featureflagtenant",
        "vacation": "ferias",
        "payroll": "folhapagamento",
        "pregnancy": "gestacao",
        "overtime": "horaextra",
        "schedule": "horario",
        "nursing-admission": "internamentoenfermaria",
        "sales-item": "itemvenda",
        "delivery-log": "logenvio",
        "maintenance-pt": "manutencao",
        "stock-movement": "movimentoestoque",
        "occurrence": "ocorrencia",
        "professional-profile": "perfilprofissional",
        "subscription-plan": "planoassinatura",
        "coverage-plan": "planocobertura",
        "nursing-prescription": "prescricaoenfermagem",
        "prescription-item": "prescricaoitem",
        "procedure-catalog": "procedimentocatalogo",
        "procedure-material-catalog": "procedimentocatalogomaterial",
        "surgical-procedure": "procedimentocirurgico",
        "cirurgia": "surgery",
        "procedure-item": "procedimentoitem",
        "procedure-item-price": "procedimentoitemvalor",
        "procedure-material": "procedimentomaterial",
        "procedure-material-price": "procedimentomaterialvalor",
        "nursing-vitals": "sinalvitalenfermagem",
        "tenant-usage": "usotenant",
        "users": "usuarios",
        "financial-reconciliation": "financialreconciliation",
        "invoice-history": "invoicehistory",
        "invoice-item": "invoiceitem",
        "password-reset-token": "passwordresettoken",
        "medical-records": "medical_records",
        "human-resources": "human_resources",
    }
)


class AdminPathAliasMiddleware:
    """
    Path aliaser for admin and API.

    - Admin: allow English slugs (e.g., /admin/equipment-integrations/)
    - API v1: allow English/Hyphen slugs (e.g., /api/v1/external-entities/company/)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def _apply_aliases(self, segment: str, mapping: Dict[str, str]) -> tuple[str, bool]:
        key = segment.lower()
        if key in mapping:
            replacement = mapping[key]
            return replacement, replacement != segment
        return segment, False

    def __call__(self, request):
        path = request.path_info or "/"
        original = path
        parts = [p for p in path.split("/") if p != ""]

        changed = False

        # Admin: /admin/<app_label>/...
        if parts[:1] == ["admin"] and len(parts) >= 2:
            new_seg, hit = self._apply_aliases(parts[1], ADMIN_SLUG_ALIASES)
            if hit:
                parts[1] = new_seg
                changed = True
            if len(parts) >= 3:
                new_model, hit = self._apply_aliases(parts[2], ADMIN_MODEL_ALIASES)
                if hit:
                    parts[2] = new_model
                    changed = True

        # API v1: /api/v1/<prefix>/<model>/...
        if parts[:2] == ["api", "v1"] and len(parts) >= 3:
            new_prefix, hit = self._apply_aliases(parts[2], API_PREFIX_ALIASES)
            if hit:
                parts[2] = new_prefix
                changed = True
            if len(parts) >= 4:
                new_model, hit = self._apply_aliases(parts[3], API_MODEL_ALIASES)
                if hit:
                    parts[3] = new_model
                    changed = True

        if changed:
            new_path = "/" + "/".join(parts)
            if original.endswith("/") and not new_path.endswith("/"):
                new_path += "/"
            request.path_info = new_path
            request.META["PATH_INFO"] = new_path
            # Align .path with rewritten path to avoid template/context mismatches.
            if hasattr(request, "path"):
                try:
                    request.path = new_path
                except Exception:
                    # Some request objects may not allow assignment; ignore.
                    pass

        response = self.get_response(request)

        # Rewrite outgoing admin HTML so links show the alias (English) instead of the canonical label.
        if (
            (request.path_info or "").startswith("/admin/")
            and hasattr(response, "content")
            and response.get("Content-Type", "").startswith("text/html")
        ):
            content = response.content
            try:
                text = content.decode(response.charset or "utf-8")
            except Exception:
                return response

            for alias, target in ADMIN_SLUG_ALIASES.items():
                if alias == target:
                    continue
                text = text.replace(f"/admin/{target}/", f"/admin/{alias}/")
            response.content = text.encode(response.charset or "utf-8")
            if response.has_header("Content-Length"):
                response["Content-Length"] = str(len(response.content))

        return response
