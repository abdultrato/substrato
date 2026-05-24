from django.apps import apps

EXPECTED_VERBOSE_NAMES = {
    "apps.accounting": "Contabilidade e Gestão Financeira",
    "apps.ai_assistant": "IA Operacional",
    "apps.audit_activities": "Auditoria de Atividades do Sistema",
    "apps.billing": "Faturamentos e Pagamentos Médicos",
    "apps.bloodbank": "Banco de Sangue e Hemoterapia",
    "apps.education": "Educação",
    "apps.clinical": "Serviços Clínicos",
    "apps.consultations": "Consultas Médicas",
    "apps.equipment": "Equipamentos do Hospital",
    "apps.equipment_integrations": "Integrações de Equipamentos com o Sistema",
    "apps.external_entities": "Entidades Internas e Externas",
    "apps.human_resources": "Recursos Humanos",
    "apps.identity": "Identidade e Acesso do Usuário",
    "apps.incidents": "Incidentes",
    "apps.inspections": "Inspeções de Segurança e Manutenção",
    "apps.insurer": "Seguradoras de Saúde e Planos de Saúde",
    "apps.maintenance": "Manutenções e Calibrações de Equipamentos",
    "apps.maternity": "Maternidade | Obstetrícia | Neonatologia",
    "apps.medical_records": "Prontuário Médico",
    "apps.monitoring": "Monitoramento e Indicadores de Saúde",
    "apps.notifications": "Notificações e Alertas",
    "apps.nursing": "Enfermagem e Cuidados",
    "apps.payments": "Pagamentos e Gerenciamento Financeiro",
    "apps.pharmacy": "Farmácia e Gestão de Estoque",
    "apps.reception": "Recepção e Atendimento ao Paciente",
    "apps.surgery": "Cirurgias e Procedimentos Cirúrgicos",
    "apps.tenants": "Inquilinos e Locações de Hospitais",
}


def _iter_domain_app_configs():
    return sorted(
        (config for config in apps.get_app_configs() if config.name.startswith("apps.")),
        key=lambda config: config.name,
    )


def test_all_domain_apps_have_non_empty_verbose_name():
    missing = []
    placeholder_like = []

    for config in _iter_domain_app_configs():
        verbose_name = str(getattr(config, "verbose_name", "")).strip()
        if not verbose_name:
            missing.append(config.name)
            continue

        module_text = config.name.split(".")[-1].replace("_", " ").strip().lower()
        if verbose_name.lower() == module_text:
            placeholder_like.append((config.name, verbose_name))

    assert not missing, f"Apps sem verbose_name: {missing}"
    assert not placeholder_like, (
        "Apps com verbose_name potencialmente não traduzido: "
        f"{placeholder_like}"
    )


def test_education_and_clinical_verbose_names_are_portuguese():
    configs_by_name = {config.name: config for config in _iter_domain_app_configs()}
    for app_name, expected in EXPECTED_VERBOSE_NAMES.items():
        config = configs_by_name[app_name]
        assert str(config.verbose_name).strip() == expected


def test_all_domain_app_verbose_names_match_expected_portuguese_mapping():
    current_mapping = {
        config.name: str(config.verbose_name).strip()
        for config in _iter_domain_app_configs()
    }
    assert current_mapping == EXPECTED_VERBOSE_NAMES
