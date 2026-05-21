from __future__ import annotations

import logging
import unicodedata

from rest_framework import permissions

from security.permissions.base import tenant_matches_request

logger = logging.getLogger("security.permissions.rbac")


def _normalize(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn")


SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
WRITE_METHODS = frozenset({"POST", "PUT", "PATCH"})


GROUPS = {
    "ADMIN": "Administrador",
    "RECEPCAO": "Recepcionista",
    "LABORATORIO": "Técnico de Laboratório",
    "ENFERMAGEM": "Enfermeiro",
    "PROFESSOR": "Professor",
    "DIRETOR_ESCOLA": "Diretor da Escola",
    "DIRETOR_ADJUNTO_PEDAGOGICO": "Diretor Adjunto Pedagógico",
    "ENCARREGADO_EDUCACAO": "Encarregado de Educação",
    "TEACHER": "Teacher",
    "ESTUDANTE": "Estudante",
    "STUDENT_EN": "Student",
    "MEDICINA": "Médico",
    "FARMACIA": "Técnico de Farmácia",
    "MANUTENCAO": "Manutenção",
    "MEDICINA_OCUPACIONAL": "Medicina Ocupacional",
    "CONTABILIDADE": "Contabilidade",
    "RECURSOS_HUMANOS": "Gestor de RH",
}


def _policy() -> dict[str, dict[str, frozenset[str]]]:
    # Keys for groups are normalized to be resilient to old date without accents.
    g = {k: _normalize(v) for k, v in GROUPS.items()}
    education_manage = {
        "education-student": SAFE_METHODS | WRITE_METHODS,
        "education-teacher": SAFE_METHODS | WRITE_METHODS,
        "education-course": SAFE_METHODS | WRITE_METHODS,
        "education-classroom": SAFE_METHODS | WRITE_METHODS,
        "education-enrollment": SAFE_METHODS | WRITE_METHODS,
        "education-attendance": SAFE_METHODS | WRITE_METHODS,
        "education-grade": SAFE_METHODS | WRITE_METHODS,
        "education-examination": SAFE_METHODS | WRITE_METHODS,
        "education-content": SAFE_METHODS | WRITE_METHODS,
    }
    education_read = {
        "education-student": SAFE_METHODS,
        "education-course": SAFE_METHODS,
        "education-classroom": SAFE_METHODS,
        "education-enrollment": SAFE_METHODS,
        "education-attendance": SAFE_METHODS,
        "education-grade": SAFE_METHODS,
        "education-examination": SAFE_METHODS,
        "education-content": SAFE_METHODS,
    }
    accounting_crud = SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"})
    bloodbank_operational = SAFE_METHODS | WRITE_METHODS
    bloodbank_read = SAFE_METHODS
    equipment_read = {
        "equipamentos-equipment": SAFE_METHODS,
        "equipamentos-inspecaodiaria": SAFE_METHODS,
        "equipamentos-manutencao": SAFE_METHODS,
        "equipamentos-ocorrencia": SAFE_METHODS,
        "equipment-equipment": SAFE_METHODS,
        "equipment-daily_inspection": SAFE_METHODS,
        "equipment-inspecaodiaria": SAFE_METHODS,
        "equipment-maintenance": SAFE_METHODS,
        "equipment-manutencao": SAFE_METHODS,
        "equipment-incident": SAFE_METHODS,
        "equipment-ocorrencia": SAFE_METHODS,
    }
    equipment_crud = {
        basename: SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"})
        for basename in equipment_read
    }
    equipment_integration_read = {
        "equipment_integrations-equipment": SAFE_METHODS,
        "equipment_integrations-credential": SAFE_METHODS,
        "equipment_integrations-routing": SAFE_METHODS,
        "equipment_integrations-order": SAFE_METHODS,
        "equipment_integrations-order_item": SAFE_METHODS,
        "equipment_integrations-message": SAFE_METHODS,
        "equipment_integrations-document": SAFE_METHODS,
        "equipment_integrations-analyte_mapping": SAFE_METHODS,
    }
    equipment_integration_crud = {
        basename: SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"})
        for basename in equipment_integration_read
    }
    external_entities_crud = SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"})
    human_resources_crud = {
        "recursos_humanos-role": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "recursos_humanos-profissao": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "recursos_humanos-employee": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "recursos_humanos-processodisciplinar": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "recursos_humanos-agregadofamiliar": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "recursos_humanos-horario": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "recursos_humanos-falta": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "recursos_humanos-ferias": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "recursos_humanos-dispensa": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "recursos_humanos-horaextra": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "recursos_humanos-folhapagamento": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "human_resources-role": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "human_resources-profissao": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "human_resources-employee": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "human_resources-processodisciplinar": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "human_resources-agregadofamiliar": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "human_resources-horario": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "human_resources-falta": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "human_resources-ferias": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "human_resources-dispensa": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "human_resources-horaextra": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
        "human_resources-folhapagamento": SAFE_METHODS | WRITE_METHODS | frozenset({"DELETE"}),
    }

    # NOTE: basenames follow api/v1/roteamento/rotas.py: "{prefix}-{name_model}"
    # Ex.: /api/v1/clinico/exam/ -> basename "clinico-exam"
    return {
        g["RECEPCAO"]: {
            # Recepcao (workspace + fila/atendimento)
            "recepcao-workspace": SAFE_METHODS,
            "recepcao-checkin": SAFE_METHODS | WRITE_METHODS,
            "recepcao-atendimento": SAFE_METHODS | frozenset({"POST"}),
            # SGE (somente leitura)
            **equipment_read,
            **equipment_integration_read,
            # Clinico
            "clinico-patient": SAFE_METHODS | WRITE_METHODS,
            "clinico-requisicaoanalise": SAFE_METHODS | WRITE_METHODS,
            "clinico-requisicaoitem": SAFE_METHODS,
            # Catálogo (leitura para criar requisições)
            "clinico-exam": SAFE_METHODS,
            "clinico-examecampo": SAFE_METHODS,
            "clinico-examemedico": SAFE_METHODS,
            "clinico-examemedicocampo": SAFE_METHODS,
            # Financeiro
            "faturamento-invoice": SAFE_METHODS | WRITE_METHODS,
            "faturamento-faturaitem": SAFE_METHODS | WRITE_METHODS,
            "faturamento-historicofatura": SAFE_METHODS,
            "pagamentos-recibo": SAFE_METHODS,
            "pagamentos-payment": SAFE_METHODS | frozenset({"POST"}),
            # Consultas
            "consultations-consultation": SAFE_METHODS | WRITE_METHODS,
            "consultations-doctors": SAFE_METHODS,
            "consultations-holiday": SAFE_METHODS,
            "consultations-medicos": SAFE_METHODS,
            "consultations-specialty": SAFE_METHODS,
            "consultations-feriado": SAFE_METHODS,
            # Entidades externas (empresas para medicina ocupacional / terceirizações)
            "entidades-empresa": external_entities_crud,
            # --- API v1 routes (English prefixes) ---
            "clinical-patient": SAFE_METHODS | WRITE_METHODS,
            "clinical-labrequest": SAFE_METHODS | WRITE_METHODS,
            "clinical-labrequestitem": SAFE_METHODS,
            "clinical-exam": SAFE_METHODS,
            "clinical-examfield": SAFE_METHODS,
            "clinical-medicalexam": SAFE_METHODS,
            "clinical-medicalexamfield": SAFE_METHODS,
            "clinical-medicalresultfile": SAFE_METHODS,
            "clinical-sample": SAFE_METHODS,
            "billing-invoice": SAFE_METHODS | WRITE_METHODS,
            "billing-invoiceitem": SAFE_METHODS | WRITE_METHODS,
            "billing-invoicehistory": SAFE_METHODS,
            "payments-recibo": SAFE_METHODS,
            "payments-payment": SAFE_METHODS | frozenset({"POST"}),
            "external_entities-empresa": external_entities_crud,
            # Logística interna → requisições à farmácia
            "pharmacy-lot": SAFE_METHODS,
            "pharmacy-requisicaomaterial": SAFE_METHODS | WRITE_METHODS,
        },
        g["LABORATORIO"]: {
            # Laboratorio só: requisicoes + resultados (sem catálogo de exams)
            "clinico-requisicaoanalise": SAFE_METHODS,
            "clinico-requisicaoitem": SAFE_METHODS,
            "clinico-resultadoitem": SAFE_METHODS | WRITE_METHODS,
            # --- API v1 routes (English prefixes) ---
            "clinical-labrequest": SAFE_METHODS,
            "clinical-labrequestitem": SAFE_METHODS,
            "clinical-resultitem": SAFE_METHODS | WRITE_METHODS,
            "clinical-exam": SAFE_METHODS,
            "clinical-examfield": SAFE_METHODS,
            "clinical-medicalexam": SAFE_METHODS,
            "clinical-medicalexamfield": SAFE_METHODS,
            "clinical-medicalresultfile": SAFE_METHODS,
            "clinical-sample": SAFE_METHODS,
            # Banco de sangue (triagem, doações e manutenção operacional)
            "bloodbank-doacao": bloodbank_operational,
            "bloodbank-unidade": bloodbank_operational,
            "bloodbank-armazenamento": bloodbank_read,
            "bloodbank-transfusao": bloodbank_read,
            "bloodbank-movimentoestoque": bloodbank_read,
            "bloodbank-manutencaoarmazenamento": bloodbank_operational,
            # Logística interna → requisições à farmácia
            "pharmacy-lot": SAFE_METHODS,
            "pharmacy-requisicaomaterial": SAFE_METHODS | WRITE_METHODS,
            # SGE (CRUD total)
            **equipment_crud,
            **equipment_integration_crud,
        },
        g["ENFERMAGEM"]: {
            # Apoio operacional + execucao de procedures
            "clinico-patient": SAFE_METHODS,
            "clinico-requisicaoanalise": SAFE_METHODS,
            "clinico-requisicaoitem": SAFE_METHODS,
            # SGE (somente leitura)
            **equipment_read,
            **equipment_integration_read,
            # Para mapear exam id -> name na UI atual
            "clinico-exam": SAFE_METHODS,
            "clinico-examemedico": SAFE_METHODS,
            "clinico-examemedicocampo": SAFE_METHODS,
            # Enfermagem (CRUD operacional)
            "enfermagem-registroenfermagem": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-sinalvitalenfermagem": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-prescricaoenfermagem": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-evolucaoenfermagem": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-procedure": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-procedimentocatalogo": SAFE_METHODS,
            "enfermagem-procedimentocatalogomaterial": SAFE_METHODS,
            "enfermagem-procedimentoitem": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-procedimentoitemvalor": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-procedimentomaterial": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-procedimentomaterialvalor": SAFE_METHODS | WRITE_METHODS,
            # Enfermaria (camas/internamentos) + dashboard
            "enfermagem-ward": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-camaenfermaria": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-internamentoenfermaria": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-enfermariadashboard": SAFE_METHODS,
            # --- API v1 routes (English prefixes) ---
            "clinical-patient": SAFE_METHODS,
            "clinical-labrequest": SAFE_METHODS,
            "clinical-labrequestitem": SAFE_METHODS,
            "clinical-exam": SAFE_METHODS,
            "clinical-examfield": SAFE_METHODS,
            "clinical-medicalexam": SAFE_METHODS,
            "clinical-medicalexamfield": SAFE_METHODS,
            "clinical-medicalresultfile": SAFE_METHODS,
            "clinical-sample": SAFE_METHODS,
            "nursing-nursingrecord": SAFE_METHODS | WRITE_METHODS,
            "nursing-nursingvitalsign": SAFE_METHODS | WRITE_METHODS,
            "nursing-nursingprescription": SAFE_METHODS | WRITE_METHODS,
            "nursing-nursingevolution": SAFE_METHODS | WRITE_METHODS,
            "nursing-procedure": SAFE_METHODS | WRITE_METHODS,
            "nursing-procedurecatalog": SAFE_METHODS,
            "nursing-procedurecatalogmaterial": SAFE_METHODS,
            "nursing-procedureitem": SAFE_METHODS | WRITE_METHODS,
            "nursing-procedureitemvalue": SAFE_METHODS | WRITE_METHODS,
            "nursing-procedurematerial": SAFE_METHODS | WRITE_METHODS,
            "nursing-procedurematerialvalue": SAFE_METHODS | WRITE_METHODS,
            "nursing-ward": SAFE_METHODS | WRITE_METHODS,
            "nursing-wardbed": SAFE_METHODS | WRITE_METHODS,
            "nursing-hospitalization": SAFE_METHODS | WRITE_METHODS,
            "nursing-warddashboard": SAFE_METHODS,
            # Banco de sangue (requisição/execução de transfusões e aviação)
            "bloodbank-doacao": bloodbank_read,
            "bloodbank-unidade": bloodbank_operational,
            "bloodbank-armazenamento": bloodbank_read,
            "bloodbank-transfusao": bloodbank_operational,
            "bloodbank-movimentoestoque": bloodbank_read,
            "bloodbank-manutencaoarmazenamento": bloodbank_read,
            # Logística interna → requisições à farmácia
            "pharmacy-lot": SAFE_METHODS,
            "pharmacy-requisicaomaterial": SAFE_METHODS | WRITE_METHODS,
            # Prontuário / Maternidade / Cirurgia (read-only no MVP)
            "prontuario-record": SAFE_METHODS,
            "prontuario-prescricaoitem": SAFE_METHODS,
            "maternidade-gestacao": SAFE_METHODS,
            "surgery-surgery": SAFE_METHODS,
        },
        g["MEDICINA"]: {
            # Jornada clinica (anamnese/diagnosis não expostos na API v1)
            "clinico-patient": SAFE_METHODS,
            "clinico-requisicaoanalise": SAFE_METHODS | WRITE_METHODS,
            "clinico-requisicaoitem": SAFE_METHODS,
            "clinico-exam": SAFE_METHODS,
            # --- API v1 routes (English prefixes) ---
            "clinical-patient": SAFE_METHODS,
            "clinical-labrequest": SAFE_METHODS | WRITE_METHODS,
            "clinical-labrequestitem": SAFE_METHODS,
            "clinical-exam": SAFE_METHODS,
            "clinical-examfield": SAFE_METHODS,
            "clinical-medicalexam": SAFE_METHODS,
            "clinical-medicalexamfield": SAFE_METHODS,
            "clinical-medicalresultfile": SAFE_METHODS,
            "clinical-sample": SAFE_METHODS,
            # SGE (somente leitura)
            **equipment_read,
            **equipment_integration_read,
            # Exames medicos (catálogo e requisições médicas)
            "clinico-examemedico": SAFE_METHODS,
            "clinico-examemedicocampo": SAFE_METHODS,
            # Consultas
            "consultations-consultation": SAFE_METHODS | WRITE_METHODS,
            "consultations-doctors": SAFE_METHODS,
            "consultations-holiday": SAFE_METHODS,
            "consultations-medicos": SAFE_METHODS,
            "consultations-specialty": SAFE_METHODS,
            "consultations-feriado": SAFE_METHODS,
            # Prontuário / Maternidade / Cirurgia (MVP)
            "prontuario-record": SAFE_METHODS | WRITE_METHODS,
            "prontuario-prescricaoitem": SAFE_METHODS | WRITE_METHODS,
            "maternidade-gestacao": SAFE_METHODS | WRITE_METHODS,
            "surgery-surgery": SAFE_METHODS | WRITE_METHODS,
            # Banco de sangue (consulta clínica e solicitação de transfusão)
            "bloodbank-doacao": bloodbank_read,
            "bloodbank-unidade": bloodbank_read,
            "bloodbank-armazenamento": bloodbank_read,
            "bloodbank-transfusao": bloodbank_operational,
            "bloodbank-movimentoestoque": bloodbank_read,
            "bloodbank-manutencaoarmazenamento": bloodbank_read,
            # Logística interna → requisições à farmácia
            "pharmacy-lot": SAFE_METHODS,
            "pharmacy-requisicaomaterial": SAFE_METHODS | WRITE_METHODS,
        },
        g["MEDICINA_OCUPACIONAL"]: {
            "clinico-patient": SAFE_METHODS | WRITE_METHODS,
            "clinico-requisicaoanalise": SAFE_METHODS | WRITE_METHODS,
            "clinico-requisicaoitem": SAFE_METHODS,
            "clinico-exam": SAFE_METHODS,
            "clinico-examemedico": SAFE_METHODS,
            "clinico-examemedicocampo": SAFE_METHODS,
            # --- API v1 routes (English prefixes) ---
            "clinical-patient": SAFE_METHODS | WRITE_METHODS,
            "clinical-labrequest": SAFE_METHODS | WRITE_METHODS,
            "clinical-labrequestitem": SAFE_METHODS,
            "clinical-exam": SAFE_METHODS,
            "clinical-examfield": SAFE_METHODS,
            "clinical-medicalexam": SAFE_METHODS,
            "clinical-medicalexamfield": SAFE_METHODS,
            "clinical-medicalresultfile": SAFE_METHODS,
            "clinical-sample": SAFE_METHODS,
            # SGE (somente leitura)
            **equipment_read,
            **equipment_integration_read,
            # Empresas/entidades externas
            "entidades-empresa": external_entities_crud,
            "external_entities-empresa": external_entities_crud,
            # Pode abrir catálogo de procedures para requisitar/consultar
            "enfermagem-procedimentocatalogo": SAFE_METHODS,
            "enfermagem-procedure": SAFE_METHODS | frozenset({"POST"}),
            # Consultas
            "consultations-consultation": SAFE_METHODS | WRITE_METHODS,
            "consultations-doctors": SAFE_METHODS,
            "consultations-holiday": SAFE_METHODS,
            "consultations-medicos": SAFE_METHODS,
            "consultations-specialty": SAFE_METHODS,
            "consultations-feriado": SAFE_METHODS,
            # Prontuário / Maternidade / Cirurgia (MVP)
            "prontuario-record": SAFE_METHODS | WRITE_METHODS,
            "prontuario-prescricaoitem": SAFE_METHODS | WRITE_METHODS,
            "maternidade-gestacao": SAFE_METHODS | WRITE_METHODS,
            "surgery-surgery": SAFE_METHODS | WRITE_METHODS,
            # Logística interna → requisições à farmácia
            "pharmacy-lot": SAFE_METHODS,
            "pharmacy-requisicaomaterial": SAFE_METHODS | WRITE_METHODS,
        },
        g["PROFESSOR"]: education_manage,
        g["DIRETOR_ESCOLA"]: education_manage,
        g["DIRETOR_ADJUNTO_PEDAGOGICO"]: education_manage,
        g["TEACHER"]: education_manage,
        g["ESTUDANTE"]: education_read,
        g["ENCARREGADO_EDUCACAO"]: education_read,
        g["STUDENT_EN"]: education_read,
        g["FARMACIA"]: {
            # Almoxarifado / estoque
            "farmacia-product": SAFE_METHODS | WRITE_METHODS,
            "farmacia-lot": SAFE_METHODS | WRITE_METHODS,
            "farmacia-movimentoestoque": SAFE_METHODS | WRITE_METHODS,
            "farmacia-sale": SAFE_METHODS | WRITE_METHODS,
            "farmacia-itemvenda": SAFE_METHODS | WRITE_METHODS,
            # --- API v1 routes (English prefixes) ---
            "pharmacy-product": SAFE_METHODS | WRITE_METHODS,
            "pharmacy-lot": SAFE_METHODS | WRITE_METHODS,
            "pharmacy-movimentoestoque": SAFE_METHODS | WRITE_METHODS,
            "pharmacy-sale": SAFE_METHODS | WRITE_METHODS,
            "pharmacy-itemvenda": SAFE_METHODS | WRITE_METHODS,
            # Logística interna (receber/aviar/arquivar requisições)
            "pharmacy-requisicaomaterial": SAFE_METHODS | WRITE_METHODS,
            "pharmacy-requisicaomaterialitem": SAFE_METHODS | WRITE_METHODS,
            # SGE (somente leitura)
            **equipment_read,
            **equipment_integration_read,
            # (Opcional) consultar patient para vinculos operacionais
            "clinico-patient": SAFE_METHODS,
            "clinical-patient": SAFE_METHODS,
        },
        g["MANUTENCAO"]: {
            # SGE (somente leitura)
            **equipment_read,
            **equipment_integration_read,
            # Logística interna → requisições à farmácia
            "pharmacy-lot": SAFE_METHODS,
            "pharmacy-requisicaomaterial": SAFE_METHODS | WRITE_METHODS,
        },
        g["CONTABILIDADE"]: {
            # Contabilidade (CRUD) + auditoria read-only de recepcao/financeiro
            "contabilidade-account": accounting_crud,
            "contabilidade-entry": accounting_crud,
            "contabilidade-movimento": accounting_crud,
            "contabilidade-conciliacaofinanceira": accounting_crud,
            # --- API v1 routes (English prefixes) ---
            "accounting-account": accounting_crud,
            "accounting-entry": accounting_crud,
            "accounting-movement": accounting_crud,
            "accounting-financialreconciliation": accounting_crud,
            # Pacientes (leitura para contexto das faturas)
            "clinico-patient": SAFE_METHODS,
            # SGE (somente leitura)
            **equipment_read,
            **equipment_integration_read,
            "faturamento-invoice": SAFE_METHODS,
            "faturamento-faturaitem": SAFE_METHODS,
            "faturamento-historicofatura": SAFE_METHODS,
            "pagamentos-recibo": SAFE_METHODS,
            # Contabilidade faz controle e pode lançar/ajustar pagamentos.
            "pagamentos-payment": SAFE_METHODS | WRITE_METHODS,
            "pagamentos-transaction": SAFE_METHODS,
            "pagamentos-reconciliacao": SAFE_METHODS,
            "recepcao-checkin": SAFE_METHODS,
            "recepcao-atendimento": SAFE_METHODS,
            "recepcao-workspace": SAFE_METHODS,
            # Consultas (leitura)
            "consultations-consultation": SAFE_METHODS,
            "consultations-doctors": SAFE_METHODS,
            "consultations-holiday": SAFE_METHODS,
            "consultations-medicos": SAFE_METHODS,
            "consultations-specialty": SAFE_METHODS,
            "consultations-feriado": SAFE_METHODS,
            # Estatísticas
            "dashboard-analytics": SAFE_METHODS,
            # Logística interna → requisições à farmácia
            "pharmacy-lot": SAFE_METHODS,
            "pharmacy-requisicaomaterial": SAFE_METHODS | WRITE_METHODS,
        },
        g["RECURSOS_HUMANOS"]: {
            # RH (CRUD interno)
            **human_resources_crud,
            # SGE (somente leitura)
            **equipment_read,
            **equipment_integration_read,
            # Precisa listar usuários para vincular a funcionários.
            "identidade-user": SAFE_METHODS,
            # Logística interna → requisições à farmácia
            "pharmacy-lot": SAFE_METHODS,
            "pharmacy-requisicaomaterial": SAFE_METHODS | WRITE_METHODS,
        },
    }


ROLE_POLICY = _policy()


class RBACPermission(permissions.BasePermission):
    """
    Permissao baseada em grupos (Django auth.Group) por rota (basename).

    - Superuser: acesso total
    - Grupo "Administrador": acesso total
    - Demais grupos: acesso conforme ROLE_POLICY
    """

    message = "A sua account nao tem permissao para aceder a este recurso."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return False

        if getattr(user, "is_superuser", False):
            return True

        try:
            raw_groups = list(user.groups.values_list("name", flat=True))
        except Exception:
            raw_groups = []

        user_groups = {_normalize(g) for g in raw_groups if g}

        if _normalize(GROUPS["ADMIN"]) in user_groups:
            return True

        # Tenant isolation: evita que um token de um tenant opere em outro tenant
        # mudando o Host header/domínio.
        if not tenant_matches_request(request, user):
            logger.info(
                "tenant_mismatch_denied",
                extra={
                    "user_id": getattr(user, "id", None),
                    "user_tenant_id": getattr(user, "tenant_id", None),
                    "request_tenant_id": getattr(getattr(request, "tenant", None), "id", None),
                    "method": getattr(request, "method", None),
                    "path": getattr(request, "path", None),
                },
            )
            return False

        basename = getattr(view, "basename", None)
        if not basename:
            # Defensive fallback: for non-router APIViews, keep IsAuthenticated behavior.
            return True

        method = (getattr(request, "method", "") or "").upper()

        allowed = False
        for group in user_groups:
            perms = ROLE_POLICY.get(group)
            if not perms:
                continue
            methods = perms.get(basename)
            if methods and method in methods:
                allowed = True
                break

        if not allowed:
            logger.info(
                "rbac_denied",
                extra={
                    "user_id": getattr(user, "id", None),
                    "basename": basename,
                    "method": method,
                    "groups": raw_groups,
                },
            )

        return allowed
"""Implementação de RBAC (roles, recursos, permissões) da aplicação."""
