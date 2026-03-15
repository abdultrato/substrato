from __future__ import annotations

import logging
import unicodedata

from rest_framework import permissions

logger = logging.getLogger("seguranca.permissoes.rbac")


def _normalize(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return value


SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
WRITE_METHODS = frozenset({"POST", "PUT", "PATCH"})


GROUPS = {
    "ADMIN": "Administrador",
    "RECEPCAO": "Recepcionista",
    "LABORATORIO": "Técnico de Laboratório",
    "ENFERMAGEM": "Enfermeiro",
    "MEDICINA": "Médico",
    "FARMACIA": "Técnico de Farmácia",
    "MEDICINA_OCUPACIONAL": "Medicina Ocupacional",
    "CONTABILIDADE": "Contabilidade",
    "RECURSOS_HUMANOS": "Gestor de RH",
}


def _policy() -> dict[str, dict[str, frozenset[str]]]:
    # Keys for groups are normalized to be resilient to old data without accents.
    g = {k: _normalize(v) for k, v in GROUPS.items()}

    # NOTE: basenames follow api/v1/roteamento/rotas.py: "{prefixo}-{nome_modelo}"
    # Ex.: /api/v1/clinico/exame/ -> basename "clinico-exame"
    return {
        g["RECEPCAO"]: {
            # Recepcao (workspace + fila/atendimento)
            "recepcao-workspace": SAFE_METHODS,
            "recepcao-checkin": SAFE_METHODS | WRITE_METHODS,
            "recepcao-atendimento": SAFE_METHODS | frozenset({"POST"}),
            # Clinico
            "clinico-paciente": SAFE_METHODS | WRITE_METHODS,
            "clinico-requisicaoanalise": SAFE_METHODS | WRITE_METHODS,
            "clinico-requisicaoitem": SAFE_METHODS,
            # Catálogo (somente leitura para criar requisições)
            "clinico-exame": SAFE_METHODS,
            "clinico-examecampo": SAFE_METHODS,
            "clinico-examemedico": SAFE_METHODS,
            "clinico-examemedicocampo": SAFE_METHODS,
            # Financeiro
            "faturamento-fatura": SAFE_METHODS | WRITE_METHODS,
            "faturamento-faturaitem": SAFE_METHODS | WRITE_METHODS,
            "faturamento-historicofatura": SAFE_METHODS,
            "pagamentos-recibo": SAFE_METHODS,
            "pagamentos-pagamento": SAFE_METHODS | frozenset({"POST"}),
            # Consultas
            "consultas-consulta": SAFE_METHODS | WRITE_METHODS,
            "consultas-medicos": SAFE_METHODS,
            "consultas-especialidade": SAFE_METHODS,
            "consultas-feriado": SAFE_METHODS,
            # Entidades externas (empresas para medicina ocupacional / terceirizações)
            "entidades-empresa": SAFE_METHODS | WRITE_METHODS,
        },
        g["LABORATORIO"]: {
            # Laboratorio só: requisicoes + resultados (sem catálogo de exames)
            "clinico-requisicaoanalise": SAFE_METHODS,
            "clinico-requisicaoitem": SAFE_METHODS,
            "clinico-resultadoitem": SAFE_METHODS | WRITE_METHODS,
        },
        g["ENFERMAGEM"]: {
            # Apoio operacional + execucao de procedimentos
            "clinico-paciente": SAFE_METHODS,
            "clinico-requisicaoanalise": SAFE_METHODS,
            "clinico-requisicaoitem": SAFE_METHODS,
            # Para mapear exame id -> nome na UI atual
            "clinico-exame": SAFE_METHODS,
            "clinico-examemedico": SAFE_METHODS,
            "clinico-examemedicocampo": SAFE_METHODS,
            # Enfermagem (CRUD operacional)
            "enfermagem-registroenfermagem": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-sinalvitalenfermagem": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-prescricaoenfermagem": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-evolucaoenfermagem": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-procedimento": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-procedimentocatalogo": SAFE_METHODS,
            "enfermagem-procedimentocatalogomaterial": SAFE_METHODS,
            "enfermagem-procedimentoitem": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-procedimentoitemvalor": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-procedimentomaterial": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-procedimentomaterialvalor": SAFE_METHODS | WRITE_METHODS,
            # Enfermaria (camas/internamentos) + dashboard
            "enfermagem-enfermaria": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-camaenfermaria": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-internamentoenfermaria": SAFE_METHODS | WRITE_METHODS,
            "enfermagem-enfermariadashboard": SAFE_METHODS,
            # Prontuário / Maternidade / Cirurgia (read-only no MVP)
            "prontuario-registro": SAFE_METHODS,
            "prontuario-prescricaoitem": SAFE_METHODS,
            "maternidade-gestacao": SAFE_METHODS,
            "cirurgia-cirurgia": SAFE_METHODS,
        },
        g["MEDICINA"]: {
            # Jornada clinica (anamnese/diagnostico ainda no admin/api futura)
            "clinico-paciente": SAFE_METHODS,
            "clinico-requisicaoanalise": SAFE_METHODS | WRITE_METHODS,
            "clinico-requisicaoitem": SAFE_METHODS,
            "clinico-exame": SAFE_METHODS,
            # Exames medicos (catálogo e requisições médicas)
            "clinico-examemedico": SAFE_METHODS,
            "clinico-examemedicocampo": SAFE_METHODS,
            # Consultas
            "consultas-consulta": SAFE_METHODS | WRITE_METHODS,
            "consultas-medicos": SAFE_METHODS,
            "consultas-especialidade": SAFE_METHODS,
            "consultas-feriado": SAFE_METHODS,
            # Prontuário / Maternidade / Cirurgia (MVP)
            "prontuario-registro": SAFE_METHODS | WRITE_METHODS,
            "prontuario-prescricaoitem": SAFE_METHODS | WRITE_METHODS,
            "maternidade-gestacao": SAFE_METHODS | WRITE_METHODS,
            "cirurgia-cirurgia": SAFE_METHODS | WRITE_METHODS,
        },
        g["MEDICINA_OCUPACIONAL"]: {
            "clinico-paciente": SAFE_METHODS | WRITE_METHODS,
            "clinico-requisicaoanalise": SAFE_METHODS | WRITE_METHODS,
            "clinico-requisicaoitem": SAFE_METHODS,
            "clinico-exame": SAFE_METHODS,
            "clinico-examemedico": SAFE_METHODS,
            "clinico-examemedicocampo": SAFE_METHODS,
            # Empresas/entidades externas
            "entidades-empresa": SAFE_METHODS | WRITE_METHODS,
            # Pode abrir catálogo de procedimentos para requisitar/consultar
            "enfermagem-procedimentocatalogo": SAFE_METHODS,
            "enfermagem-procedimento": SAFE_METHODS | frozenset({"POST"}),
            # Consultas
            "consultas-consulta": SAFE_METHODS | WRITE_METHODS,
            "consultas-medicos": SAFE_METHODS,
            "consultas-especialidade": SAFE_METHODS,
            "consultas-feriado": SAFE_METHODS,
            # Prontuário / Maternidade / Cirurgia (MVP)
            "prontuario-registro": SAFE_METHODS | WRITE_METHODS,
            "prontuario-prescricaoitem": SAFE_METHODS | WRITE_METHODS,
            "maternidade-gestacao": SAFE_METHODS | WRITE_METHODS,
            "cirurgia-cirurgia": SAFE_METHODS | WRITE_METHODS,
        },
        g["FARMACIA"]: {
            # Almoxarifado / estoque
            "farmacia-produto": SAFE_METHODS | WRITE_METHODS,
            "farmacia-lote": SAFE_METHODS | WRITE_METHODS,
            "farmacia-movimentoestoque": SAFE_METHODS | WRITE_METHODS,
            "farmacia-venda": SAFE_METHODS | WRITE_METHODS,
            "farmacia-itemvenda": SAFE_METHODS | WRITE_METHODS,
            # (Opcional) consultar paciente para vinculos operacionais
            "clinico-paciente": SAFE_METHODS,
        },
        g["CONTABILIDADE"]: {
            # Contabilidade (CRUD) + auditoria read-only de recepcao/financeiro
            "contabilidade-conta": SAFE_METHODS | WRITE_METHODS,
            "contabilidade-lancamento": SAFE_METHODS | WRITE_METHODS,
            "contabilidade-movimento": SAFE_METHODS | WRITE_METHODS,
            "contabilidade-conciliacaofinanceira": SAFE_METHODS | WRITE_METHODS,
            "faturamento-fatura": SAFE_METHODS,
            "faturamento-historicofatura": SAFE_METHODS,
            "pagamentos-recibo": SAFE_METHODS,
            # Contabilidade faz controle e pode lançar/ajustar pagamentos.
            "pagamentos-pagamento": SAFE_METHODS | WRITE_METHODS,
            "pagamentos-transacao": SAFE_METHODS,
            "pagamentos-reconciliacao": SAFE_METHODS,
            "recepcao-checkin": SAFE_METHODS,
            "recepcao-atendimento": SAFE_METHODS,
            "recepcao-workspace": SAFE_METHODS,
            # Consultas (somente leitura)
            "consultas-consulta": SAFE_METHODS,
            "consultas-medicos": SAFE_METHODS,
            "consultas-especialidade": SAFE_METHODS,
            "consultas-feriado": SAFE_METHODS,
            # Estatísticas
            "dashboard-analytics": SAFE_METHODS,
        },
        g["RECURSOS_HUMANOS"]: {
            # RH (CRUD interno)
            "recursos_humanos-cargo": SAFE_METHODS | WRITE_METHODS,
            "recursos_humanos-funcionario": SAFE_METHODS | WRITE_METHODS,
            "recursos_humanos-agregadofamiliar": SAFE_METHODS | WRITE_METHODS,
            "recursos_humanos-horario": SAFE_METHODS | WRITE_METHODS,
            "recursos_humanos-falta": SAFE_METHODS | WRITE_METHODS,
            "recursos_humanos-ferias": SAFE_METHODS | WRITE_METHODS,
            "recursos_humanos-dispensa": SAFE_METHODS | WRITE_METHODS,
            "recursos_humanos-horaextra": SAFE_METHODS | WRITE_METHODS,
            "recursos_humanos-folhapagamento": SAFE_METHODS | WRITE_METHODS,
            # Precisa listar usuários para vincular a funcionários.
            "identidade-usuario": SAFE_METHODS,
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

    message = "A sua conta nao tem permissao para aceder a este recurso."

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
