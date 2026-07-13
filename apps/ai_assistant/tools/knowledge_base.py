from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher
from functools import lru_cache
import re
from typing import Any

from apps.ai_assistant.tools.resource_catalog import match_resource_descriptors, normalize_text
from substrato_os.domain_modules import INSTALLED_DOMAIN_APP_CONFIGS

from .base import AiTool, AiToolContext


@dataclass(frozen=True, slots=True)
class KnowledgeEntry:
    id: str
    category: str
    questions_pt: tuple[str, ...]
    answer_pt: str
    questions_en: tuple[str, ...] = ()
    answer_en: str = ""
    aliases_pt: tuple[str, ...] = ()
    aliases_en: tuple[str, ...] = ()
    follow_ups_pt: tuple[str, ...] = ()
    follow_ups_en: tuple[str, ...] = ()
    semantic_terms: tuple[str, ...] = ()
    tags: tuple[str, ...] = ()
    module_key: str = ""
    priority: int = 50
    source: str = "builtin"
    database_id: int | None = None


@dataclass(frozen=True, slots=True)
class RankedEntry:
    entry: KnowledgeEntry
    score: float
    matched_question: str


@dataclass(frozen=True, slots=True)
class ModuleKnowledgeSpec:
    key: str
    pt: str
    en: str
    scope: str
    filters: str
    metrics: str
    actions: str
    examples_pt: tuple[str, ...]
    examples_en: tuple[str, ...]
    aliases: tuple[str, ...] = ()


class KnowledgeBaseTool(AiTool):
    name = "answer_predicted_question"
    description_pt = "Responde perguntas previstas, sugere correcções de ortografia e orienta o utilizador sem tocar em dados operacionais."
    description_en = "Answers predicted questions, suggests spelling corrections and guides the user without touching operational data."
    required_groups: tuple[str, ...] = ()
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        message = str(context.arguments.get("message") or "")
        language = context.language
        ranked = rank_knowledge_entries(message, limit=6, tenant=context.tenant, active_module=context.active_module)
        best = ranked[0] if ranked else None

        if best and best.score >= 0.84:
            return _answer_payload(
                entry=best.entry,
                score=best.score,
                language=language,
                matched_question=best.matched_question,
                tenant=context.tenant,
            )

        if best and best.score >= 0.40:
            suggestions = [_suggestion_payload(item.entry, language=language, score=item.score) for item in ranked[:5]]
            return _suggestion_payload_result(
                language=language,
                suggestions=suggestions,
                score=best.score,
                message=message,
            )

        fallback = entry_by_id("help-question-examples", tenant=context.tenant) or knowledge_entries(tenant=context.tenant)[0]
        return _answer_payload(entry=fallback, score=0.42, language=language, matched_question="", tenant=context.tenant)


def should_select_knowledge_base(*, message: str, active_module: str = "", tenant=None) -> bool:
    normalized = normalize_text(f"{message or ''} {active_module or ''}")
    if not normalized:
        return False
    command_text = _strip_request_intro(normalized)

    personal_terms = ("quem sou", "meu login", "meus grupos", "minha conta", "meu perfil", "who am i", "my account")
    if any(term in normalized for term in personal_terms):
        return False

    direct_action_terms = (
        "crie ",
        "criar ",
        "insira ",
        "inserir ",
        "adicione ",
        "adicionar ",
        "altere ",
        "alterar ",
        "actualizar ",
        "actualize ",
        "atualizar ",
        "atualize ",
        "edite ",
        "editar ",
        "corrija ",
        "corrigir ",
        "remova ",
        "remover ",
        "apague ",
        "apagar ",
        "elimine ",
        "eliminar ",
        "exclua ",
        "excluir ",
        "delete ",
        "create ",
        "insert ",
        "update ",
        "remove ",
    )
    if command_text.startswith(direct_action_terms) and not any(term in command_text for term in ("como", "help", "ajuda", "explica", "exemplo")):
        return False

    report_action_terms = (
        "gere ",
        "gerar ",
        "preparar ",
        "prepare ",
        "exporte ",
        "exportar ",
        "generate ",
        "export ",
    )
    if command_text.startswith(report_action_terms) and any(term in command_text for term in ("relatorio", "relatório", "report", "export")):
        return False

    operational_query_prefixes = (
        "quantos ",
        "quantas ",
        "quanto ",
        "quanta ",
        "qual era ",
        "qual foi ",
        "quais ",
        "mostra ",
        "mostre ",
        "liste ",
        "listar ",
        "procure ",
        "buscar ",
        "pesquise ",
        "quero investigar ",
        "resumo ",
        "relatorio ",
        "relatório ",
    )
    if command_text.startswith(operational_query_prefixes) and _has_resource_descriptor_match(command_text):
        return False

    operational_query_terms = (
        "paciente",
        "pacientes",
        "estudante",
        "estudantes",
        "equipamento",
        "equipamentos",
        "dispositivo",
        "dispositivos",
        "manutencao",
        "manutenção",
        "manutencoes",
        "manutenções",
        "ocorrencia",
        "ocorrência",
        "ocorrencias",
        "ocorrências",
        "inspecao",
        "inspeção",
        "inspecoes",
        "inspeções",
        "fatura",
        "faturas",
        "pagamento",
        "pagamentos",
        "estoque",
        "stock",
        "medicacao",
        "medicação",
        "requisicao",
        "requisição",
        "consulta",
        "consultas",
        "financeiro",
        "financeira",
        "matricula",
        "matrícula",
        "matriculas",
        "matrículas",
    )
    if command_text.startswith(operational_query_prefixes) and any(term in command_text for term in operational_query_terms):
        return False

    if _has_operational_crud_intent(command_text):
        return False

    support_terms = (
        "ajuda",
        "ajude",
        "como",
        "qual e",
        "qual é",
        "o que",
        "oque",
        "onde",
        "quando",
        "quem",
        "porque",
        "por que",
        "posso",
        "pode",
        "funciona",
        "significa",
        "perguntas",
        "exemplos",
        "sugestao",
        "sugestão",
        "duvida",
        "dúvida",
        "help",
        "how",
        "what",
        "where",
        "when",
        "why",
        "can i",
        "examples",
    )
    if any(term in normalized for term in support_terms):
        return True

    ranked = rank_knowledge_entries(message, limit=1, tenant=tenant, active_module=active_module)
    return bool(ranked and ranked[0].score >= 0.40)


def _strip_request_intro(normalized: str) -> str:
    cleaned = normalized.strip()
    intro_patterns = (
        r"^(?:por favor|please)\s+",
        r"^(?:diga[- ]me|diz[- ]me|fale[- ]me|mostre[- ]me|mostra[- ]me)\s+(?:de\s+)?",
        r"^(?:gostaria de saber|quero saber|preciso saber|pretendo saber)\s+",
    )
    for pattern in intro_patterns:
        cleaned = re.sub(pattern, "", cleaned).strip()
    return cleaned


def _has_resource_descriptor_match(normalized: str) -> bool:
    return bool(match_resource_descriptors(normalized, limit=1))


def _has_operational_crud_intent(normalized: str) -> bool:
    support_prefixes = (
        "como ",
        "de que forma ",
        "o que ",
        "oque ",
        "quais ",
        "que campos ",
        "posso ",
        "pode ",
        "ajuda ",
        "ajude ",
        "help ",
        "how ",
        "what ",
    )
    if normalized.startswith(support_prefixes):
        return False

    crud_terms = (
        "criar",
        "crie",
        "inserir",
        "insira",
        "cadastrar",
        "cadastre",
        "registar",
        "registe",
        "registrar",
        "adicione",
        "adicionar",
        "novo",
        "nova",
        "actualizar",
        "atualizar",
        "actualize",
        "atualize",
        "alterar",
        "altere",
        "editar",
        "edite",
        "corrigir",
        "corrija",
        "apagar",
        "apague",
        "remover",
        "remova",
        "eliminar",
        "elimine",
        "excluir",
        "exclua",
        "create",
        "insert",
        "update",
        "delete",
        "remove",
    )
    if not any(re.search(rf"(?<!\w){re.escape(term)}(?!\w)", normalized) for term in crud_terms):
        return False
    return _has_resource_descriptor_match(normalized)


def entry_by_id(entry_id: str, *, tenant=None) -> KnowledgeEntry | None:
    return next((entry for entry in knowledge_entries(tenant=tenant) if entry.id == entry_id), None)


def rank_knowledge_entries(message: str, *, limit: int = 5, tenant=None, active_module: str = "") -> list[RankedEntry]:
    normalized = normalize_text(message)
    if not normalized:
        return []

    text_ranked = _text_rank_knowledge_entries(
        normalized=normalized,
        tenant=tenant,
        active_module=active_module,
        limit=limit,
    )
    if text_ranked and text_ranked[0].score >= 0.84:
        return text_ranked[:limit]

    # Try vector search when text matching is not confident enough.
    vector_results = _vector_search_knowledge_entries(message, limit=limit, tenant=tenant)
    if vector_results:
        ranked_by_entry: dict[str, RankedEntry] = {item.entry.id: item for item in text_ranked}
        for entry_id, score in vector_results:
            entry = entry_by_id(entry_id, tenant=tenant)
            if entry:
                _, matched_question = _entry_score(entry=entry, normalized=normalized)
                score = min(1.0, score + _module_boost(entry=entry, active_module=active_module))
                current = ranked_by_entry.get(entry.id)
                if current is None or score > current.score:
                    ranked_by_entry[entry.id] = RankedEntry(entry=entry, score=score, matched_question=matched_question)

        ranked = list(ranked_by_entry.values())
        ranked.sort(key=lambda item: (item.score, item.entry.priority, item.entry.source == "database"), reverse=True)
        return ranked[:limit]

    return text_ranked[:limit]


def _text_rank_knowledge_entries(
    *,
    normalized: str,
    tenant=None,
    active_module: str = "",
    limit: int = 5,
) -> list[RankedEntry]:
    ranked: list[RankedEntry] = []
    for entry in knowledge_entries(tenant=tenant):
        score, matched = _entry_score(entry=entry, normalized=normalized)
        score = min(1.0, score + _module_boost(entry=entry, active_module=active_module))
        if score <= 0:
            continue
        ranked.append(RankedEntry(entry=entry, score=score, matched_question=matched))
    ranked.sort(key=lambda item: (item.score, item.entry.priority, item.entry.source == "database"), reverse=True)
    return ranked[:limit]


def _vector_search_knowledge_entries(message: str, *, limit: int = 5, tenant=None) -> list[tuple[str, float]]:
    """
    Search for knowledge entries using vector similarity.

    Returns:
        List of tuples (entry_id, similarity_score) sorted by score descending
    """
    try:
        from apps.ai_assistant.services.vector_store import get_vector_store_service

        # Get vector store service
        vector_store = get_vector_store_service()
        if vector_store is None:
            return []

        # If the index is not loaded (e.g., first time or after failure), rebuild it.
        # We do not rebuild on every search to avoid performance degradation.
        # The index is rebuilt when the knowledge base is updated via the management command
        # or when the service detects a model/version change.
        if vector_store.index is None:
            vector_store.rebuild_index()

        # Search using vector similarity
        return vector_store.search(message, k=limit)
    except Exception:
        # If vector search fails, return empty to fall back to text search
        return []


def knowledge_entries(*, tenant=None) -> tuple[KnowledgeEntry, ...]:
    builtin_entries = _builtin_knowledge_entries()
    database_entries = _database_knowledge_entries(tenant=tenant)
    if not database_entries:
        return builtin_entries
    overridden_ids = {entry.id for entry in database_entries}
    return (*database_entries, *(entry for entry in builtin_entries if entry.id not in overridden_ids))


def _database_knowledge_entries(*, tenant=None) -> tuple[KnowledgeEntry, ...]:
    if tenant is None:
        return ()
    try:
        from django.db import DatabaseError, OperationalError, ProgrammingError

        from apps.ai_assistant.models import AiKnowledgeEntry

        rows = (
            AiKnowledgeEntry.objects.filter(
                tenant=tenant,
                status=AiKnowledgeEntry.Status.ACTIVE,
            )
            .order_by("-priority", "category", "title", "-id")
            .only(
                "id",
                "slug",
                "title",
                "category",
                "module_key",
                "priority",
                "source",
                "questions_pt",
                "questions_en",
                "aliases_pt",
                "aliases_en",
                "answer_pt",
                "answer_en",
                "follow_ups_pt",
                "follow_ups_en",
                "semantic_terms",
                "tags",
            )
        )
        return tuple(_model_to_entry(row) for row in rows)
    except (DatabaseError, OperationalError, ProgrammingError):
        return ()


def _model_to_entry(row) -> KnowledgeEntry:
    category = str(row.category or row.module_key or "personalizada").strip()
    module_key = str(row.module_key or "").strip()
    tags = (
        *_string_tuple(row.tags),
        *_string_tuple(row.semantic_terms),
        category,
        module_key,
        str(row.title or ""),
    )
    return KnowledgeEntry(
        id=str(row.slug or f"database-{row.id}"),
        category=category,
        questions_pt=_string_tuple(row.questions_pt) or (str(row.title or row.slug),),
        answer_pt=str(row.answer_pt or ""),
        questions_en=_string_tuple(row.questions_en),
        answer_en=str(row.answer_en or ""),
        aliases_pt=_string_tuple(row.aliases_pt),
        aliases_en=_string_tuple(row.aliases_en),
        follow_ups_pt=_string_tuple(row.follow_ups_pt),
        follow_ups_en=_string_tuple(row.follow_ups_en),
        semantic_terms=_string_tuple(row.semantic_terms),
        tags=tuple(item for item in tags if item),
        module_key=module_key,
        priority=int(row.priority or 50),
        source="database",
        database_id=int(row.id),
    )


def _string_tuple(value: Any) -> tuple[str, ...]:
    if value is None:
        return ()
    if isinstance(value, str):
        items = re.split(r"[\n;]+", value)
    elif isinstance(value, (list, tuple, set)):
        items = value
    else:
        return ()
    cleaned = []
    for item in items:
        text = str(item or "").strip()
        if text:
            cleaned.append(text)
    return tuple(cleaned)


@lru_cache(maxsize=1)
def _builtin_knowledge_entries() -> tuple[KnowledgeEntry, ...]:
    entries: list[KnowledgeEntry] = [
        KnowledgeEntry(
            id="help-question-examples",
            category="ajuda",
            questions_pt=(
                "Que perguntas posso fazer?",
                "Ajuda-me a usar a IA",
                "Mostre exemplos de perguntas",
                "O que posso perguntar?",
                "Como devo perguntar?",
            ),
            questions_en=("What can I ask?", "Show question examples", "Help me use the AI"),
            answer_pt=(
                "Pode perguntar por identidade do sistema, contexto do utilizador, permissões, módulos, estatísticas, relatórios, "
                "stock histórico, erros, requisições, pacientes, faturação, pagamentos, educação e também pedir CRUD por conversa. "
                "Inclua sempre que possível módulo, período, código, nome ou acção esperada."
            ),
            answer_en=(
                "You can ask about system identity, user context, permissions, modules, statistics, reports, historical stock, errors, "
                "requests, patients, billing, payments, education and conversational CRUD. Include module, period, code, name or expected action when possible."
            ),
            follow_ups_pt=(
                "Quantos pacientes deram entrada hoje?",
                "Qual era o stock de medicação Paracetamol ontem?",
                "Como criar um paciente pela IA?",
                "Quem criou o sistema?",
            ),
            follow_ups_en=(
                "How many patients were admitted today?",
                "What was the Paracetamol medication stock yesterday?",
                "How do I create a patient with AI?",
                "Who created the system?",
            ),
            tags=("ajuda", "exemplos", "perguntas"),
        ),
        KnowledgeEntry(
            id="ai-capabilities",
            category="ia",
            questions_pt=("O que a IA consegue fazer?", "Para que serve a IA Operacional?", "Quais são as capacidades da IA?"),
            questions_en=("What can the AI do?", "What is the Operational AI for?"),
            answer_pt=(
                "A IA Operacional identifica o utilizador autenticado, respeita RBAC e tenant, consulta dados autorizados, executa analytics SQL seguros, "
                "prepara CRUD com confirmação, cria tarefas operacionais, prepara relatórios e sugere próximas perguntas quando a intenção está incompleta."
            ),
            answer_en=(
                "The Operational AI identifies the authenticated user, respects RBAC and tenant scope, queries authorized data, runs safe SQL analytics, "
                "prepares confirmable CRUD, creates operational tasks, prepares reports and suggests follow-up questions when intent is incomplete."
            ),
            follow_ups_pt=("Que dados posso investigar?", "Como criar registos pela IA?", "Como funcionam as permissões da IA?"),
            follow_ups_en=("What data can I investigate?", "How do I create records with AI?", "How do AI permissions work?"),
            tags=("ia", "capacidades", "operacional"),
        ),
        KnowledgeEntry(
            id="ai-typing-correction",
            category="ia",
            questions_pt=("A IA entende erros de ortografia?", "E se eu escrever errado?", "A IA corrige perguntas mal escritas?"),
            questions_en=("Does the AI understand typos?", "What if I mistype a question?"),
            answer_pt=(
                "Sim. Quando a pergunta parecer próxima de uma pergunta prevista, a IA pergunta 'Quis dizer...?' e mostra sugestões. "
                "Ao clicar numa sugestão, a pergunta é enviada automaticamente e a resposta aparece no chat."
            ),
            answer_en=(
                "Yes. When the question looks close to a predicted question, the AI asks 'Did you mean...?' and shows suggestions. "
                "Clicking a suggestion sends the question automatically and the answer appears in chat."
            ),
            follow_ups_pt=("Que perguntas posso fazer?", "Mostre exemplos de perguntas", "Como devo perguntar?"),
            follow_ups_en=("What can I ask?", "Show question examples", "How should I ask?"),
            tags=("ortografia", "sugestoes", "correcao"),
        ),
        KnowledgeEntry(
            id="permissions-rbac",
            category="seguranca",
            questions_pt=("Como funcionam as permissões da IA?", "A IA respeita permissões?", "A IA vê dados sem acesso?"),
            questions_en=("How do AI permissions work?", "Does the AI respect permissions?"),
            answer_pt=(
                "A IA usa o mesmo utilizador autenticado, tenant e grupos RBAC da aplicação. Se o utilizador não tiver acesso ao recurso, "
                "a IA bloqueia a consulta ou acção e responde que não pode fazê-lo por falta de permissão."
            ),
            answer_en=(
                "The AI uses the same authenticated user, tenant and RBAC groups as the application. If the user lacks access to a resource, "
                "the AI blocks the query or action and says it cannot do it because permission is missing."
            ),
            follow_ups_pt=("Quem sou eu neste sistema?", "Que dados posso investigar?", "O que acontece se eu não tiver acesso?"),
            follow_ups_en=("Who am I in this system?", "What data can I investigate?", "What happens if I do not have access?"),
            tags=("rbac", "permissoes", "seguranca"),
        ),
        KnowledgeEntry(
            id="tenant-scope",
            category="seguranca",
            questions_pt=("A IA consulta dados de outro tenant?", "A IA mistura dados de tenants?", "Qual é o escopo do tenant?"),
            questions_en=("Can the AI query another tenant?", "Does the AI mix tenant data?"),
            answer_pt=(
                "Não deve misturar tenants. As ferramentas internas aplicam escopo por tenant e utilizador autenticado. "
                "A resposta deve sempre vir do tenant activo na sessão."
            ),
            answer_en=(
                "It should not mix tenants. Internal tools apply tenant and authenticated-user scope. The answer should always come from the active tenant in the session."
            ),
            follow_ups_pt=("Quem sou eu neste sistema?", "Como funcionam as permissões da IA?"),
            follow_ups_en=("Who am I in this system?", "How do AI permissions work?"),
            tags=("tenant", "escopo", "seguranca"),
        ),
        KnowledgeEntry(
            id="crud-confirmation",
            category="crud",
            questions_pt=("Como funciona o CRUD por IA?", "A IA pode criar registos?", "A IA pode alterar ou apagar dados?"),
            questions_en=("How does AI CRUD work?", "Can the AI create records?", "Can the AI update or delete data?"),
            answer_pt=(
                "A IA prepara a operação em conversa, recolhe os campos em falta, valida serializer e RBAC, mas a escrita só acontece depois de confirmação explícita no botão gerado pela IA."
            ),
            answer_en=(
                "The AI prepares the operation conversationally, collects missing fields, validates serializer and RBAC, but writes only happen after explicit confirmation on the AI-generated button."
            ),
            follow_ups_pt=("Como criar um paciente pela IA?", "Como alterar um registo pela IA?", "Como apagar um registo pela IA?"),
            follow_ups_en=("How do I create a patient with AI?", "How do I update a record with AI?", "How do I delete a record with AI?"),
            tags=("crud", "confirmacao", "escrita"),
        ),
        KnowledgeEntry(
            id="create-patient",
            category="crud",
            questions_pt=("Como criar um paciente pela IA?", "Como registar paciente?", "Como cadastrar paciente com IA?"),
            questions_en=("How do I create a patient with AI?", "How do I register a patient?"),
            answer_pt=(
                "Peça em linguagem natural, por exemplo: 'Crie um paciente chamado Maria Mussa, contacto +258 84 000 0000'. "
                "Se faltar algum campo obrigatório, a IA pergunta. Depois prepara a acção e só grava quando confirmar."
            ),
            answer_en=(
                "Ask in natural language, for example: 'Create a patient called Maria Mussa, phone +258 84 000 0000'. "
                "If a required field is missing, the AI asks. Then it prepares the action and only saves after confirmation."
            ),
            aliases_pt=(
                "Como meto um doente novo?",
                "Como inserir um utente novo?",
                "Como dar entrada de um doente?",
                "Como criar novo doente?",
            ),
            aliases_en=("How do I add a new patient?", "How do I enter a new patient?"),
            semantic_terms=("paciente", "doente", "utente", "novo", "criar", "registar", "entrada clínica"),
            follow_ups_pt=("Crie um paciente chamado Paciente Teste.", "Que campos são obrigatórios para paciente?"),
            follow_ups_en=("Create a patient called Test Patient.", "Which fields are required for a patient?"),
            tags=("paciente", "crud", "clinical"),
        ),
        KnowledgeEntry(
            id="sql-analytics",
            category="analytics",
            questions_pt=("Como fazer estatísticas pela IA?", "Como pesquisar dados por período?", "A IA faz analytics SQL?"),
            questions_en=("How do I run statistics with AI?", "Can the AI run SQL analytics?"),
            answer_pt=(
                "Use perguntas com recurso, período e agrupamento. Exemplos: 'Quanto faturou este mês por estado?', "
                "'Quantos pacientes deram entrada hoje?', 'Mostre erros 5xx dos últimos 7 dias'. A IA devolve contagens, agrupamentos, tendência e comparação em formato narrativo, sem listar tabelas ou linhas individuais."
            ),
            answer_en=(
                "Use questions with resource, period and grouping. Examples: 'How much was billed this month by status?', "
                "'How many patients were admitted today?', 'Show 5xx errors from the last 7 days'. The AI returns counts, groups, trend and comparison as a narrative, without listing tables or individual rows."
            ),
            follow_ups_pt=("Quanto faturou este mês por estado?", "Quantos pacientes deram entrada hoje?", "Mostre erros do sistema dos últimos 7 dias"),
            follow_ups_en=("How much was billed this month by status?", "How many patients were admitted today?", "Show system errors from the last 7 days"),
            tags=("analytics", "sql", "estatisticas"),
        ),
        KnowledgeEntry(
            id="stock-history",
            category="farmacia",
            questions_pt=("Como perguntar stock histórico?", "Como saber estoque numa data?", "Qual era o stock de um medicamento?"),
            questions_en=("How do I ask historical stock?", "How do I know stock on a date?"),
            answer_pt=(
                "Indique o produto e a data. Exemplo: 'Qual era o stock de medicação Paracetamol ontem?' ou "
                "'Qual era o estoque de medicação K no dia 2026-05-11?'. A IA reconstrói o saldo pelos movimentos de stock registados."
            ),
            answer_en=(
                "Provide product and date. Example: 'What was the Paracetamol medication stock yesterday?' or "
                "'What was medication K stock on 2026-05-11?'. The AI reconstructs balance from recorded stock movements."
            ),
            follow_ups_pt=("Qual era o stock de medicação Paracetamol ontem?", "Qual era o estoque de medicação K no dia 2026-05-11?"),
            follow_ups_en=("What was the Paracetamol medication stock yesterday?", "What was medication K stock on 2026-05-11?"),
            tags=("stock", "farmacia", "historico"),
        ),
        KnowledgeEntry(
            id="reports",
            category="relatorios",
            questions_pt=("Como gerar relatório pela IA?", "A IA gera relatórios?", "Como exportar relatório operacional?"),
            questions_en=("How do I generate a report with AI?", "Can the AI generate reports?"),
            answer_pt=(
                "Peça o tipo e período: 'Gere relatório operacional dos últimos 30 dias'. A IA prepara o relatório como acção confirmável, "
                "com fontes e resumo das ferramentas internas usadas."
            ),
            answer_en=(
                "Ask for type and period: 'Generate an operational report for the last 30 days'. The AI prepares the report as a confirmable action, "
                "with sources and summary of internal tools used."
            ),
            follow_ups_pt=("Gere relatório operacional dos últimos 30 dias.", "Quais alertas activos existem agora?"),
            follow_ups_en=("Generate an operational report for the last 30 days.", "What active alerts exist now?"),
            tags=("relatorio", "exportar", "pdf"),
        ),
        KnowledgeEntry(
            id="language-switch",
            category="interface",
            questions_pt=("Como mudar idioma?", "O sistema suporta inglês?", "Como voltar para português?"),
            questions_en=("How do I change language?", "Does the system support English?"),
            answer_pt=(
                "Use o botão de idioma no rodapé. Em português, o botão muda para inglês; em inglês, muda de volta para português. "
                "A escolha deve persistir nas páginas seguintes."
            ),
            answer_en=(
                "Use the language button in the footer. In Portuguese, it switches to English; in English, it switches back to Portuguese. "
                "The choice should persist across later pages."
            ),
            follow_ups_pt=("Porque ainda vejo texto em português quando estou em inglês?", "Como reportar uma tradução em falta?"),
            follow_ups_en=("Why do I still see Portuguese text while in English?", "How do I report a missing translation?"),
            tags=("idioma", "i18n", "interface"),
        ),
        KnowledgeEntry(
            id="system-identity",
            category="projecto",
            questions_pt=("Quem criou o sistema?", "Quando começou o desenvolvimento do sistema?", "Qual é o repositório do sistema?"),
            questions_en=("Who created the system?", "When did system development start?", "What is the system repository?"),
            answer_pt=(
                "Essa pergunta é respondida com dados do GitHub. Pergunte exactamente 'Quem criou o sistema?' para a IA consultar a ferramenta de identidade do projecto."
            ),
            answer_en=(
                "This question is answered using GitHub data. Ask exactly 'Who created the system?' so the AI queries the project identity tool."
            ),
            follow_ups_pt=("Quem criou o sistema?", "Quando começou a ser desenvolvido o sistema?"),
            follow_ups_en=("Who created the system?", "When did system development start?"),
            tags=("github", "autor", "projecto"),
        ),
    ]

    for module in _module_catalog():
        entries.extend(_module_entries(module))
    entries.extend(_workflow_entries())
    return tuple(entries)


def _module_catalog() -> tuple[ModuleKnowledgeSpec, ...]:
    modules: list[ModuleKnowledgeSpec] = []
    for app_config in INSTALLED_DOMAIN_APP_CONFIGS:
        key = _module_key_from_app_config(app_config)
        modules.append(_module_spec_by_key(key))
    return tuple(modules)


def _module_entries(module: ModuleKnowledgeSpec) -> list[KnowledgeEntry]:
    pt = module.pt
    en = module.en
    lower_pt = pt.lower()
    examples_pt = module.examples_pt[:3]
    examples_en = module.examples_en[:3]
    tags = tuple(dict.fromkeys((module.key, lower_pt, "modulo", *module.aliases)))
    return [
        KnowledgeEntry(
            id=f"module-{module.key}-overview",
            category="modulos",
            questions_pt=(f"O que faz o módulo {pt}?", f"Para que serve {pt}?", f"Explique o módulo {pt}"),
            questions_en=(f"What does the {en} module do?", f"Explain the {en} module"),
            answer_pt=(
                f"O módulo {pt} cobre {module.scope}. "
                f"Use filtros como {module.filters}. "
                f"Pode pedir indicadores como {module.metrics} e preparar acções como {module.actions}, "
                "sempre dentro do seu perfil e com confirmação quando houver escrita."
            ),
            answer_en=(
                f"The {en} module covers {module.scope}. "
                f"Use filters such as {module.filters}. "
                f"You can ask for indicators such as {module.metrics} and prepare actions like {module.actions}, "
                "always within your profile and with confirmation for writes."
            ),
            follow_ups_pt=(f"Que perguntas posso fazer em {pt}?", f"Como pesquisar dados em {pt}?", f"Como criar registos em {pt} pela IA?"),
            follow_ups_en=(f"What can I ask in {en}?", f"How do I search data in {en}?", f"How do I create records in {en} with AI?"),
            tags=tags,
        ),
        KnowledgeEntry(
            id=f"module-{module.key}-examples",
            category="exemplos",
            questions_pt=(f"Que perguntas posso fazer em {pt}?", f"Dê exemplos de perguntas em {pt}", f"Como usar a IA em {pt}?"),
            questions_en=(f"What can I ask in {en}?", f"Give me example prompts for {en}", f"How do I use AI in {en}?"),
            answer_pt=(
                f"Em {pt}, faça perguntas operacionais claras. Exemplos: "
                f"{'; '.join(examples_pt)}. "
                f"Também pode pedir pesquisa por {module.filters}, resumo de {module.metrics} "
                f"e preparação de {module.actions}."
            ),
            answer_en=(
                f"In {en}, ask clear operational questions. Examples: "
                f"{'; '.join(examples_en)}. "
                f"You can also ask for searches by {module.filters}, summaries of {module.metrics} "
                f"and preparation of actions like {module.actions}."
            ),
            follow_ups_pt=examples_pt,
            follow_ups_en=examples_en,
            tags=tags,
        ),
        KnowledgeEntry(
            id=f"module-{module.key}-search",
            category="pesquisa",
            questions_pt=(f"Como pesquisar dados em {pt}?", f"Como procurar registos de {pt}?", f"Como listar {pt}?"),
            questions_en=(f"How do I search data in {en}?", f"How do I list {en} records?"),
            answer_pt=(
                f"Pergunte com recurso, filtro e período. Em {pt}, os filtros úteis incluem {module.filters}. "
                f"Exemplos: 'Mostre registos de {lower_pt} dos últimos 7 dias', "
                f"'Procure {lower_pt} por código ou nome' ou 'Liste {lower_pt} pendentes de hoje'. "
                "A IA só devolve dados permitidos pelo seu perfil."
            ),
            answer_en=(
                f"Ask with resource, filter and period. In {en}, useful filters include {module.filters}. "
                f"Examples: 'Show {en} records from the last 7 days', "
                f"'Search {en} by code or name' or 'List pending {en} for today'. "
                "The AI only returns data allowed by your profile."
            ),
            follow_ups_pt=(f"Mostre registos de {lower_pt} dos últimos 7 dias", f"Que filtros posso aplicar em {pt}?", examples_pt[0]),
            follow_ups_en=(f"Show {en} records from the last 7 days", f"What filters can I apply in {en}?", examples_en[0]),
            tags=tags,
        ),
        KnowledgeEntry(
            id=f"module-{module.key}-analytics",
            category="analytics",
            questions_pt=(f"Que estatísticas posso pedir em {pt}?", f"Como analisar {pt}?", f"Que indicadores existem em {pt}?"),
            questions_en=(f"What statistics can I ask in {en}?", f"How do I analyse {en}?"),
            answer_pt=(
                f"Em {pt}, pode pedir {module.metrics}. "
                f"Use um período e, se precisar, um filtro como {module.filters}. "
                "A resposta deve sair em resumo narrativo, sem linguagem de base de dados e sem linhas individuais."
            ),
            answer_en=(
                f"In {en}, you can ask for {module.metrics}. "
                f"Use a period and, if needed, a filter such as {module.filters}. "
                "The answer should stay as a narrative summary, without database jargon or individual rows."
            ),
            follow_ups_pt=(f"Quantos registos de {lower_pt} existem este mês?", f"Compare {lower_pt} com o período anterior", f"Distribua {lower_pt} por estado"),
            follow_ups_en=(f"How many {en} records exist this month?", f"Compare {en} with the previous period", f"Break down {en} by status"),
            tags=tags,
        ),
        KnowledgeEntry(
            id=f"module-{module.key}-crud",
            category="crud",
            questions_pt=(f"Como criar registos em {pt} pela IA?", f"A IA pode alterar dados de {pt}?", f"Como apagar dados de {pt}?"),
            questions_en=(f"How do I create records in {en} with AI?", f"Can the AI update {en} data?"),
            answer_pt=(
                f"Peça em linguagem natural a criação, alteração ou remoção. "
                f"Em {pt}, a IA pode ajudar em acções como {module.actions}. "
                "Ela identifica o recurso, recolhe campos obrigatórios, valida permissões e só grava depois de confirmação explícita."
            ),
            answer_en=(
                f"Ask in natural language for creation, update or deletion. "
                f"In {en}, the AI can help with actions such as {module.actions}. "
                "It identifies the resource, collects required fields, validates permissions and only writes after explicit confirmation."
            ),
            follow_ups_pt=(f"Crie um registo de {lower_pt}", f"Que campos são obrigatórios em {pt}?", "Como funciona o CRUD por IA?"),
            follow_ups_en=(f"Create a {en} record", f"Which fields are required in {en}?", "How does AI CRUD work?"),
            tags=tags,
        ),
    ]


MODULE_SPECS: dict[str, ModuleKnowledgeSpec] = {
    "accounting": ModuleKnowledgeSpec(
        key="accounting",
        pt="Contabilidade",
        en="Accounting",
        scope="contas, lançamentos, movimentos, reconciliações e saldos contabilísticos",
        filters="conta, lançamento, período, estado, referência e valor",
        metrics="totais por conta, evolução de lançamentos, saldo por período e reconciliações pendentes",
        actions="abrir lançamentos, rever reconciliações e preparar registos contabilísticos",
        examples_pt=("Qual é o saldo desta conta hoje?", "Mostre lançamentos pendentes deste mês", "Que reconciliações estão em atraso?"),
        examples_en=("What is the balance of this account today?", "Show pending ledger entries for this month", "Which reconciliations are overdue?"),
        aliases=("contabilidade",),
    ),
    "ai_assistant": ModuleKnowledgeSpec(
        key="ai_assistant",
        pt="IA Operacional",
        en="Operational AI",
        scope="sessões, investigações, acções sugeridas, políticas e ferramentas da própria IA",
        filters="sessão, investigação, estado, tipo de acção, ferramenta e período",
        metrics="conversas recentes, investigações prontas, acções pendentes e cobertura por tipo de pergunta",
        actions="reabrir sessão, limpar conversa, preparar tarefa e preparar relatório",
        examples_pt=("Onde vejo o histórico da IA?", "Que investigações estão prontas hoje?", "Como limpar a conversa actual?"),
        examples_en=("Where do I see AI history?", "Which investigations are ready today?", "How do I clear the current conversation?"),
        aliases=("ia", "assistant"),
    ),
    "audit_activities": ModuleKnowledgeSpec(
        key="audit_activities",
        pt="Auditoria",
        en="Audit",
        scope="actividade de utilizadores, pedidos, páginas, tempos de resposta e resultados operacionais",
        filters="utilizador, página, recurso, resultado, período e rota",
        metrics="acessos por página, alterações por utilizador, falhas por rota e volume de actividade",
        actions="rastrear actividade, rever acessos e investigar alterações em recursos",
        examples_pt=("Quem entrou nesta página hoje?", "Que utilizador alterou este registo?", "Mostre a actividade administrativa desta semana"),
        examples_en=("Who opened this page today?", "Which user changed this record?", "Show administrative activity for this week"),
        aliases=("auditoria", "audit"),
    ),
    "billing": ModuleKnowledgeSpec(
        key="billing",
        pt="Faturamento",
        en="Billing",
        scope="faturas, itens, estados, emissão, revisão e ligação com fluxos clínicos",
        filters="paciente, fatura, estado, período, caixa e valor",
        metrics="faturas emitidas, pagas, pendentes, valores por período e pendências de emissão",
        actions="emitir fatura, rever itens, ligar faturação ao check-in e preparar correcções",
        examples_pt=("Quais faturas estão em aberto hoje?", "Que check-ins ainda não têm fatura?", "Mostre o total faturado esta semana"),
        examples_en=("Which invoices are still open today?", "Which check-ins still have no invoice?", "Show total billed this week"),
        aliases=("faturamento", "faturas"),
    ),
    "bloodbank": ModuleKnowledgeSpec(
        key="bloodbank",
        pt="Banco de Sangue",
        en="Blood Bank",
        scope="doações, unidades, armazenamento, stock, manutenção e transfusões",
        filters="dador, unidade, grupo sanguíneo, estado, local e período",
        metrics="unidades disponíveis, transfusões por período, stock por grupo e doações recentes",
        actions="registar doação, acompanhar unidades, rever stock e preparar seguimento transfusional",
        examples_pt=("Quantas unidades O+ estão disponíveis?", "Mostre transfusões de hoje", "Que bolsas estão prestes a expirar?"),
        examples_en=("How many O+ units are available?", "Show today's transfusions", "Which blood bags are close to expiry?"),
        aliases=("banco de sangue", "sangue"),
    ),
    "clinical": ModuleKnowledgeSpec(
        key="clinical",
        pt="Clínico",
        en="Clinical",
        scope="pacientes, exames, requisições, amostras e resultados clínicos",
        filters="paciente, exame, requisição, médico, estado, código e período",
        metrics="requisições criadas, colheitas pendentes, resultados críticos e volume por período",
        actions="criar paciente, criar requisição, rever resultados e orientar seguimento clínico",
        examples_pt=("Como criar um paciente pela IA?", "Mostre requisições pendentes de hoje", "Há resultados críticos agora?"),
        examples_en=("How do I create a patient with AI?", "Show pending requests for today", "Are there critical results right now?"),
        aliases=("clinico", "pacientes"),
    ),
    "clinical_laboratory": ModuleKnowledgeSpec(
        key="clinical_laboratory",
        pt="Laboratório Clínico",
        en="Clinical Laboratory",
        scope="requisições laboratoriais, colheitas, exames, frascos, amostras e resultados",
        filters="requisição, exame, amostra, tubo, estado, paciente e período",
        metrics="colheitas pendentes, resultados libertados, amostras em processamento e críticos do dia",
        actions="abrir requisição, orientar colheita, validar resultado e preparar seguimento laboratorial",
        examples_pt=("Que tubo é usado neste exame?", "Mostre requisições aguardando colheita", "Há resultados laboratoriais críticos hoje?"),
        examples_en=("Which tube is used for this exam?", "Show requests waiting for collection", "Are there critical lab results today?"),
        aliases=("laboratorio", "laboratório"),
    ),
    "clinical_pharmacy": ModuleKnowledgeSpec(
        key="clinical_pharmacy",
        pt="Farmácia Clínica",
        en="Clinical Pharmacy",
        scope="revisões terapêuticas, conciliação medicamentosa e seguimento farmacêutico clínico",
        filters="paciente, medicamento, intervenção, estado, profissional e período",
        metrics="intervenções clínicas, conciliações abertas, alertas de medicação e seguimento por período",
        actions="registar intervenção, rever terapêutica e preparar seguimento farmacêutico",
        examples_pt=("Que intervenções farmacêuticas estão abertas?", "Mostre conciliações de medicação de hoje", "Há alertas clínicos de medicação pendentes?"),
        examples_en=("Which pharmacy interventions are open?", "Show today's medication reconciliations", "Are there pending clinical medication alerts?"),
        aliases=("farmacia clinica", "farmácia clínica"),
    ),
    "consultations": ModuleKnowledgeSpec(
        key="consultations",
        pt="Consultas",
        en="Consultations",
        scope="marcações, especialidades, agendas, reagendamentos e faturação associada",
        filters="paciente, médico, especialidade, estado, data e período",
        metrics="consultas marcadas, reagendadas, canceladas, ocupação por agenda e volume por especialidade",
        actions="marcar consulta, reagendar, cancelar e preparar faturação da consulta",
        examples_pt=("Como reagendar consulta?", "Quantas consultas estão marcadas para amanhã?", "Mostre consultas canceladas desta semana"),
        examples_en=("How do I reschedule an appointment?", "How many consultations are scheduled for tomorrow?", "Show cancelled consultations this week"),
        aliases=("consultas", "marcacoes"),
    ),
    "cotacoes": ModuleKnowledgeSpec(
        key="cotacoes",
        pt="Cotações",
        en="Quotations",
        scope="cotações comerciais, pedidos, estados, clientes e valores propostos",
        filters="cliente, cotação, estado, período, valor e responsável",
        metrics="cotações abertas, aprovadas, expiradas e valor negociado por período",
        actions="criar cotação, rever proposta e acompanhar aprovação comercial",
        examples_pt=("Que cotações estão pendentes de aprovação?", "Mostre o valor total cotado este mês", "Liste cotações expiradas"),
        examples_en=("Which quotations are pending approval?", "Show the total quoted value this month", "List expired quotations"),
        aliases=("cotações", "cotacoes"),
    ),
    "credit_financing": ModuleKnowledgeSpec(
        key="credit_financing",
        pt="Crédito e Financiamento",
        en="Credit and Financing",
        scope="linhas de crédito, financiamentos, contratos, prestações e estados de cobrança",
        filters="cliente, contrato, estado, período, prestação e saldo",
        metrics="financiamentos activos, prestações em atraso, saldo financiado e cobrança por período",
        actions="abrir contrato, rever prestação e preparar seguimento financeiro",
        examples_pt=("Que prestações estão em atraso?", "Mostre contratos activos de financiamento", "Qual é o saldo financiado deste cliente?"),
        examples_en=("Which installments are overdue?", "Show active financing contracts", "What is this client's financed balance?"),
        aliases=("credito", "crédito", "financiamento"),
    ),
    "dental": ModuleKnowledgeSpec(
        key="dental",
        pt="Odontologia",
        en="Dental",
        scope="consultas dentárias, cadeiras, procedimentos, planos e evolução odontológica",
        filters="paciente, dentista, cadeira, estado, procedimento e período",
        metrics="consultas odontológicas, procedimentos realizados, ocupação de cadeiras e agenda por dentista",
        actions="marcar consulta dentária, registar procedimento e rever plano odontológico",
        examples_pt=("Que consultas dentárias estão marcadas hoje?", "Mostre procedimentos odontológicos deste paciente", "Que cadeiras estão ocupadas agora?"),
        examples_en=("Which dental appointments are scheduled today?", "Show this patient's dental procedures", "Which chairs are occupied now?"),
        aliases=("odontologia", "dental"),
    ),
    "education": ModuleKnowledgeSpec(
        key="education",
        pt="Educação",
        en="Education",
        scope="estudantes, professores, cursos, turmas, presenças, exames e notas",
        filters="estudante, professor, curso, turma, estado e período",
        metrics="matrículas activas, presenças, médias de notas, reprovações e carga lectiva",
        actions="criar estudante, abrir matrícula, lançar nota e rever assiduidade",
        examples_pt=("Quantos estudantes faltaram hoje?", "Mostre notas desta turma", "Que matrículas estão activas neste curso?"),
        examples_en=("How many students were absent today?", "Show grades for this class", "Which enrollments are active in this course?"),
        aliases=("education", "escolar"),
    ),
    "equipment": ModuleKnowledgeSpec(
        key="equipment",
        pt="Equipamentos",
        en="Equipment",
        scope="equipamentos, séries, estados, localizações e manutenção operacional",
        filters="equipamento, número de série, estado, local, fabricante e período",
        metrics="equipamentos activos, avariados, em manutenção e distribuição por estado ou local",
        actions="registar equipamento, actualizar estado e abrir seguimento de manutenção",
        examples_pt=("Que equipamentos estão avariados?", "Mostre equipamentos em manutenção", "Onde está este equipamento agora?"),
        examples_en=("Which devices are broken?", "Show equipment under maintenance", "Where is this equipment right now?"),
        aliases=("equipamentos", "equipment"),
    ),
    "equipment_integrations": ModuleKnowledgeSpec(
        key="equipment_integrations",
        pt="Integrações de Equipamentos",
        en="Equipment Integrations",
        scope="credenciais, ordens, mensagens, documentos e mapeamentos entre sistemas e equipamentos",
        filters="equipamento, ordem, mensagem, estado, integração e período",
        metrics="mensagens processadas, falhas de integração, ordens sincronizadas e latência por período",
        actions="investigar falha de integração, rever mensagem e acompanhar ordem sincronizada",
        examples_pt=("Que mensagens de integração falharam hoje?", "Mostre ordens sincronizadas deste equipamento", "Há credenciais inválidas nesta integração?"),
        examples_en=("Which integration messages failed today?", "Show synchronized orders for this device", "Are there invalid credentials in this integration?"),
        aliases=("integracoes", "integrações"),
    ),
    "external_entities": ModuleKnowledgeSpec(
        key="external_entities",
        pt="Entidades Externas",
        en="External Entities",
        scope="empresas, fornecedores, parceiros e entidades relacionadas com o ecossistema operacional",
        filters="empresa, fornecedor, estado, sector, tipo e período",
        metrics="entidades activas, parceiros por tipo, fornecedores recentes e volume por categoria",
        actions="criar entidade, actualizar dados comerciais e rever relacionamento externo",
        examples_pt=("Que fornecedores estão activos?", "Mostre empresas parceiras deste mês", "Procure esta entidade por nome ou NUIT"),
        examples_en=("Which suppliers are active?", "Show partner companies added this month", "Search this entity by name or tax number"),
        aliases=("entidades", "fornecedores"),
    ),
    "human_resources": ModuleKnowledgeSpec(
        key="human_resources",
        pt="Recursos Humanos",
        en="Human Resources",
        scope="funcionários, funções, férias, ausências, salários e processos laborais",
        filters="funcionário, função, estado, período, departamento e tipo de processo",
        metrics="funcionários activos, férias, ausências, horas extra e folha por período",
        actions="criar funcionário, rever perfil funcional e acompanhar férias ou ausências",
        examples_pt=("Que funcionários estão de férias hoje?", "Mostre ausências desta semana", "Qual é a função registada deste colaborador?"),
        examples_en=("Which employees are on leave today?", "Show absences for this week", "What role is registered for this employee?"),
        aliases=("rh", "recursos humanos"),
    ),
    "identity": ModuleKnowledgeSpec(
        key="identity",
        pt="Identidade",
        en="Identity",
        scope="utilizadores, grupos, perfis profissionais, autenticação e recuperação de acesso",
        filters="utilizador, grupo, email, estado, perfil e período",
        metrics="contas activas, bloqueadas, distribuição por grupo e perfis profissionais",
        actions="criar utilizador, associar grupo, ajustar perfil e apoiar recuperação de acesso",
        examples_pt=("Que grupos tem este utilizador?", "Mostre utilizadores bloqueados", "Como alinhar utilizador com o RH?"),
        examples_en=("Which groups does this user have?", "Show blocked users", "How do I align a user with HR?"),
        aliases=("identidade", "utilizadores"),
    ),
    "incidents": ModuleKnowledgeSpec(
        key="incidents",
        pt="Incidentes",
        en="Incidents",
        scope="ocorrências, severidade, estados, responsáveis e seguimento de incidentes",
        filters="incidente, severidade, estado, responsável, período e origem",
        metrics="incidentes por severidade, abertos, resolvidos e tempo médio de fecho",
        actions="registar incidente, atribuir seguimento e acompanhar resolução",
        examples_pt=("Que incidentes críticos estão abertos?", "Mostre ocorrências resolvidas hoje", "Qual é o tempo médio de fecho dos incidentes?"),
        examples_en=("Which critical incidents are open?", "Show incidents resolved today", "What is the average incident closure time?"),
        aliases=("ocorrencias", "ocorrências"),
    ),
    "inspections": ModuleKnowledgeSpec(
        key="inspections",
        pt="Inspecções",
        en="Inspections",
        scope="inspecções, conformidade, observações, evidências e estados de validação",
        filters="inspecção, estado, área, responsável, período e conformidade",
        metrics="inspecções concluídas, não conformidades, pendências de validação e distribuição por área",
        actions="abrir inspecção, rever conformidade e acompanhar observações",
        examples_pt=("Que inspecções estão pendentes de validação?", "Mostre não conformidades desta semana", "Quantas inspecções foram concluídas hoje?"),
        examples_en=("Which inspections are pending validation?", "Show nonconformities for this week", "How many inspections were completed today?"),
        aliases=("inspecoes", "inspeções"),
    ),
    "insurer": ModuleKnowledgeSpec(
        key="insurer",
        pt="Seguradora",
        en="Insurer",
        scope="seguradoras, planos, coberturas, autorizações e relação com o atendimento",
        filters="seguradora, plano, autorização, paciente, estado e período",
        metrics="autorizações pendentes, planos activos, cobertura utilizada e volume por seguradora",
        actions="rever cobertura, abrir autorização e acompanhar resposta da seguradora",
        examples_pt=("Que autorizações estão pendentes?", "Mostre planos activos desta seguradora", "Este paciente tem cobertura para o procedimento?"),
        examples_en=("Which authorizations are pending?", "Show active plans for this insurer", "Does this patient have coverage for the procedure?"),
        aliases=("seguradora", "seguros"),
    ),
    "maintenance": ModuleKnowledgeSpec(
        key="maintenance",
        pt="Manutenção",
        en="Maintenance",
        scope="ordens, planos, intervenções, custos e estados de manutenção",
        filters="ordem, equipamento, técnico, estado, período e custo",
        metrics="ordens abertas, concluídas, custo por período e manutenção por equipamento",
        actions="abrir ordem, atribuir técnico e acompanhar intervenção",
        examples_pt=("Que ordens de manutenção estão abertas?", "Mostre intervenções concluídas hoje", "Quanto custou a manutenção deste equipamento?"),
        examples_en=("Which maintenance orders are open?", "Show interventions completed today", "How much did maintenance cost for this device?"),
        aliases=("manutencao", "manutenção"),
    ),
    "maternity": ModuleKnowledgeSpec(
        key="maternity",
        pt="Maternidade",
        en="Maternity",
        scope="gestantes, seguimento, partos, observações e registos maternos",
        filters="gestante, parto, estado, período, profissional e risco",
        metrics="partos por período, seguimentos activos, altas e situações de risco",
        actions="registar seguimento, rever parto e acompanhar evolução materna",
        examples_pt=("Quantos partos ocorreram hoje?", "Mostre gestantes em seguimento activo", "Há casos de risco pendentes de revisão?"),
        examples_en=("How many deliveries happened today?", "Show pregnant patients in active follow-up", "Are there risk cases pending review?"),
        aliases=("maternidade",),
    ),
    "medical_records": ModuleKnowledgeSpec(
        key="medical_records",
        pt="Prontuário",
        en="Medical Records",
        scope="registos clínicos, prescrições, diagnósticos, evolução e histórico do paciente",
        filters="paciente, diagnóstico, prescrição, profissional, estado e período",
        metrics="entradas clínicas, prescrições activas, diagnósticos frequentes e evolução por período",
        actions="abrir histórico, rever prescrição e acompanhar evolução clínica",
        examples_pt=("Mostre o histórico clínico deste paciente", "Que prescrições estão activas?", "Quais são os diagnósticos mais recentes deste prontuário?"),
        examples_en=("Show this patient's clinical history", "Which prescriptions are active?", "What are the latest diagnoses in this record?"),
        aliases=("prontuario", "prontuário"),
    ),
    "monitoring": ModuleKnowledgeSpec(
        key="monitoring",
        pt="Monitoramento",
        en="Monitoring",
        scope="erros, rotas, eventos, saúde operacional e sinais de desempenho do sistema",
        filters="rota, erro, módulo, severidade, período e resultado",
        metrics="erros 4xx e 5xx, latência, actividade por rota e eventos críticos do sistema",
        actions="investigar erro, rever rota problemática e acompanhar saúde operacional",
        examples_pt=("Há erros 5xx hoje?", "Que rota falhou mais nesta hora?", "Mostre a saúde operacional do sistema agora"),
        examples_en=("Are there 5xx errors today?", "Which route failed the most this hour?", "Show system operational health right now"),
        aliases=("monitoramento", "monitoring"),
    ),
    "notifications": ModuleKnowledgeSpec(
        key="notifications",
        pt="Notificações",
        en="Notifications",
        scope="mensagens, entregas, templates, estados de envio e eventos de notificação",
        filters="canal, destinatário, estado, template, período e evento",
        metrics="entregas enviadas, falhadas, pendentes e volume por canal",
        actions="rever notificações, investigar falha de entrega e acompanhar eventos",
        examples_pt=("Que notificações falharam hoje?", "Mostre entregas pendentes", "Qual template foi mais usado esta semana?"),
        examples_en=("Which notifications failed today?", "Show pending deliveries", "Which template was used the most this week?"),
        aliases=("notificacoes", "notificações"),
    ),
    "nursing": ModuleKnowledgeSpec(
        key="nursing",
        pt="Enfermagem",
        en="Nursing",
        scope="colheitas, procedimentos, enfermaria, sinais vitais e trabalho pendente de enfermagem",
        filters="paciente, procedimento, estado, enfermaria, profissional e período",
        metrics="procedimentos pendentes, colheitas, sinais vitais registados e ocupação da enfermaria",
        actions="marcar procedimento, registar colheita e acompanhar tarefas de enfermagem",
        examples_pt=("Que procedimentos de enfermagem estão pendentes?", "Mostre sinais vitais registados hoje", "Quem aguarda colheita agora?"),
        examples_en=("Which nursing procedures are pending?", "Show vital signs recorded today", "Who is waiting for sample collection now?"),
        aliases=("enfermagem",),
    ),
    "pathology": ModuleKnowledgeSpec(
        key="pathology",
        pt="Patologia",
        en="Pathology",
        scope="acessionamentos, peças, laudos, estados e seguimento anatomopatológico",
        filters="peça, laudo, estado, paciente, período e responsável",
        metrics="peças recebidas, laudos emitidos, pendências e tempo de resposta por período",
        actions="abrir acessão, rever laudo e acompanhar processamento patológico",
        examples_pt=("Quantas peças foram acessadas hoje?", "Mostre laudos pendentes", "Que casos de patologia estão atrasados?"),
        examples_en=("How many specimens were accessioned today?", "Show pending pathology reports", "Which pathology cases are delayed?"),
        aliases=("patologia",),
    ),
    "payments": ModuleKnowledgeSpec(
        key="payments",
        pt="Pagamentos",
        en="Payments",
        scope="pagamentos, recibos, caixas, confirmações e reconciliações financeiras",
        filters="recibo, paciente, fatura, estado, caixa, método e período",
        metrics="pagamentos confirmados, falhados, recibos emitidos e valores por período",
        actions="consultar recibo, rever pagamento e acompanhar confirmação de cobrança",
        examples_pt=("Mostre recibos emitidos hoje", "Que pagamentos falharam esta semana?", "Qual é o total confirmado neste caixa?"),
        examples_en=("Show receipts issued today", "Which payments failed this week?", "What is the confirmed total in this cash desk?"),
        aliases=("pagamentos", "recibos"),
    ),
    "pharmacy": ModuleKnowledgeSpec(
        key="pharmacy",
        pt="Farmácia",
        en="Pharmacy",
        scope="produtos, lotes, stock, vendas, movimentos e validade de medicamentos",
        filters="produto, lote, categoria, movimento, validade e período",
        metrics="stock actual, rupturas, validade, lotes expirados e movimentos por período",
        actions="rever stock, criar requisição de materiais e investigar movimentos ou expirados",
        examples_pt=("Que lotes estão expirados?", "Mostre produtos abaixo do mínimo", "Qual era o stock deste medicamento ontem?"),
        examples_en=("Which lots are expired?", "Show products below minimum stock", "What was the stock of this medication yesterday?"),
        aliases=("farmacia", "farmácia"),
    ),
    "physiotherapy": ModuleKnowledgeSpec(
        key="physiotherapy",
        pt="Fisioterapia",
        en="Physiotherapy",
        scope="avaliações funcionais, planos, sessões e seguimento de reabilitação",
        filters="paciente, terapeuta, plano, sessão, estado e período",
        metrics="sessões marcadas, avaliações abertas, planos activos e evolução por período",
        actions="marcar avaliação, abrir plano terapêutico e acompanhar sessões",
        examples_pt=("Que sessões de fisioterapia estão marcadas hoje?", "Mostre avaliações funcionais pendentes", "Quantos planos activos existem agora?"),
        examples_en=("Which physiotherapy sessions are scheduled today?", "Show pending functional assessments", "How many active plans exist right now?"),
        aliases=("fisioterapia",),
    ),
    "public_health": ModuleKnowledgeSpec(
        key="public_health",
        pt="Saúde Pública",
        en="Public Health",
        scope="programas, indicadores colectivos, campanhas e seguimento populacional",
        filters="programa, indicador, local, período, estado e público-alvo",
        metrics="cobertura, adesão, campanhas activas e evolução de indicadores populacionais",
        actions="rever programa, acompanhar campanha e preparar resumo epidemiológico",
        examples_pt=("Que campanhas estão activas?", "Mostre a cobertura deste programa", "Como evoluiu este indicador no último trimestre?"),
        examples_en=("Which campaigns are active?", "Show the coverage of this program", "How did this indicator evolve last quarter?"),
        aliases=("saude publica", "saúde pública"),
    ),
    "radiology": ModuleKnowledgeSpec(
        key="radiology",
        pt="Radiologia",
        en="Radiology",
        scope="exames de imagem, pedidos, agendas, equipamentos e laudos radiológicos",
        filters="paciente, exame, equipamento, estado, médico e período",
        metrics="exames marcados, realizados, laudos pendentes e volume por modalidade",
        actions="marcar exame, rever laudo e acompanhar agenda radiológica",
        examples_pt=("Que exames de radiologia estão marcados hoje?", "Mostre laudos pendentes", "Quantos exames foram realizados nesta semana?"),
        examples_en=("Which radiology exams are scheduled today?", "Show pending radiology reports", "How many exams were performed this week?"),
        aliases=("radiologia",),
    ),
    "reception": ModuleKnowledgeSpec(
        key="reception",
        pt="Recepção",
        en="Reception",
        scope="entradas, check-ins, triagem, filas e fluxo de chegada do paciente",
        filters="paciente, check-in, estado, prioridade, atendente, código e período",
        metrics="check-ins na fila, em atendimento, recebidos hoje e tempo de espera",
        actions="acompanhar fila, abrir check-in e ligar recepção à faturação ou requisição",
        examples_pt=("Quem está há mais tempo na fila?", "Quantos check-ins estão na fila agora?", "Resume a situação da recepção hoje"),
        examples_en=("Who has been waiting the longest in the queue?", "How many check-ins are waiting now?", "Summarize reception status today"),
        aliases=("recepcao", "recepção"),
    ),
    "specialty_diagnostics": ModuleKnowledgeSpec(
        key="specialty_diagnostics",
        pt="Diagnósticos Especializados",
        en="Specialty Diagnostics",
        scope="protocolos, exames especializados, resultados e acompanhamento diagnóstico avançado",
        filters="exame, protocolo, paciente, estado, especialista e período",
        metrics="protocolos activos, exames concluídos, pendências e volume por especialidade diagnóstica",
        actions="abrir protocolo, rever exame especializado e acompanhar resultado",
        examples_pt=("Que protocolos especializados estão activos?", "Mostre exames especializados pendentes", "Quantos diagnósticos avançados saíram hoje?"),
        examples_en=("Which specialty diagnostic protocols are active?", "Show pending specialty exams", "How many advanced diagnostics were released today?"),
        aliases=("diagnosticos", "diagnósticos"),
    ),
    "surgery": ModuleKnowledgeSpec(
        key="surgery",
        pt="Cirurgia",
        en="Surgery",
        scope="cirurgias, equipas, salas, agenda, autorizações, materiais e relatórios operatórios",
        filters="paciente, cirurgia, sala, estado, equipa, data e período",
        metrics="cirurgias marcadas, autorizações pendentes, consumo de materiais e agenda por sala",
        actions="marcar cirurgia, rever autorização e acompanhar agenda ou materiais",
        examples_pt=("Que cirurgias estão marcadas hoje?", "Mostre autorizações pendentes", "Que materiais foram consumidos nesta cirurgia?"),
        examples_en=("Which surgeries are scheduled today?", "Show pending authorizations", "Which materials were consumed in this surgery?"),
        aliases=("cirurgia",),
    ),
    "telemedicine": ModuleKnowledgeSpec(
        key="telemedicine",
        pt="Telemedicina",
        en="Telemedicine",
        scope="alertas remotos, casos assíncronos, dispositivos e sala de espera virtual",
        filters="paciente, alerta, dispositivo, estado, profissional e período",
        metrics="alertas remotos, casos abertos, sinais recebidos e actividade por dispositivo",
        actions="rever alerta, acompanhar caso remoto e verificar sinais vitais à distância",
        examples_pt=("Que alertas remotos chegaram hoje?", "Mostre casos assíncronos abertos", "Há dispositivos sem sinal agora?"),
        examples_en=("Which remote alerts arrived today?", "Show open asynchronous cases", "Are there devices with no signal right now?"),
        aliases=("telemedicina",),
    ),
    "tenants": ModuleKnowledgeSpec(
        key="tenants",
        pt="Clientes",
        en="Tenants",
        scope="clientes, domínios, configurações, subscrições e recursos activos da plataforma",
        filters="cliente, domínio, estado, plano, recurso e período",
        metrics="clientes activos, consumo, subscrições, limites e uso por período",
        actions="rever tenant, ajustar configuração e acompanhar subscrição ou uso",
        examples_pt=("Que tenants estão activos?", "Mostre o uso deste cliente este mês", "Qual é o plano actual deste tenant?"),
        examples_en=("Which tenants are active?", "Show this tenant's usage this month", "What is this tenant's current plan?"),
        aliases=("tenant", "clientes"),
    ),
    "therapy": ModuleKnowledgeSpec(
        key="therapy",
        pt="Terapia",
        en="Therapy",
        scope="planos terapêuticos, sessões, intervenções e seguimento de terapias",
        filters="paciente, terapeuta, plano, sessão, estado e período",
        metrics="sessões agendadas, planos activos, intervenções realizadas e evolução terapêutica",
        actions="abrir plano, marcar sessão e acompanhar resposta terapêutica",
        examples_pt=("Que sessões de terapia estão marcadas hoje?", "Mostre planos terapêuticos activos", "Como evoluiu este paciente nas últimas sessões?"),
        examples_en=("Which therapy sessions are scheduled today?", "Show active therapy plans", "How has this patient evolved in recent sessions?"),
        aliases=("terapia", "terapias"),
    ),
    "transportation": ModuleKnowledgeSpec(
        key="transportation",
        pt="Transporte",
        en="Transportation",
        scope="veículos, rotas, motoristas, viagens, combustível e manutenção logística",
        filters="veículo, motorista, rota, viagem, estado e período",
        metrics="viagens activas, consumo de combustível, rotas concluídas e manutenção por veículo",
        actions="abrir viagem, rever rota e acompanhar disponibilidade da frota",
        examples_pt=("Que veículos estão em uso agora?", "Mostre viagens activas de hoje", "Quanto combustível foi consumido esta semana?"),
        examples_en=("Which vehicles are in use right now?", "Show today's active trips", "How much fuel was consumed this week?"),
        aliases=("transporte",),
    ),
    "veterinary": ModuleKnowledgeSpec(
        key="veterinary",
        pt="Veterinária",
        en="Veterinary",
        scope="animais, consultas veterinárias, internamentos, pedidos laboratoriais e tutor responsável",
        filters="animal, tutor, consulta, estado, espécie e período",
        metrics="consultas veterinárias, admissões, pedidos laboratoriais e volume por espécie",
        actions="marcar consulta, abrir internamento e acompanhar exames veterinários",
        examples_pt=("Que consultas veterinárias estão marcadas hoje?", "Mostre animais internados", "Que tutor está ligado a este paciente animal?"),
        examples_en=("Which veterinary appointments are scheduled today?", "Show admitted animals", "Which guardian is linked to this animal patient?"),
        aliases=("veterinaria", "veterinária"),
    ),
    "warehouse": ModuleKnowledgeSpec(
        key="warehouse",
        pt="Armazém",
        en="Warehouse",
        scope="itens, localizações, lotes, recepções, transferências e reservas de stock",
        filters="item, lote, localização, movimento, estado e período",
        metrics="stock por localização, lotes disponíveis, recepções, transferências e reservas activas",
        actions="consultar stock, rever transferências e acompanhar recepções ou reservas",
        examples_pt=("Qual é o stock deste item no armazém?", "Mostre transferências pendentes", "Que lotes estão disponíveis nesta localização?"),
        examples_en=("What is the stock of this item in the warehouse?", "Show pending transfers", "Which lots are available in this location?"),
        aliases=("armazem", "armazém"),
    ),
}


def _module_key_from_app_config(app_config: str) -> str:
    parts = app_config.split(".")
    if len(parts) >= 2:
        return parts[1]
    return app_config.rsplit(".", 1)[-1].replace("Config", "").lower()


def _module_spec_by_key(key: str) -> ModuleKnowledgeSpec:
    spec = MODULE_SPECS.get(key)
    if spec:
        return spec
    return ModuleKnowledgeSpec(
        key=key,
        pt=_humanize_module_name(key),
        en=_humanize_module_name(key),
        scope=f"recursos operacionais do módulo {key.replace('_', ' ')}",
        filters="código, nome, estado e período",
        metrics="totais por período, distribuição por estado e tendências operacionais",
        actions="consultar, resumir e preparar acções confirmáveis",
        examples_pt=(f"Mostre registos de {key.replace('_', ' ')} de hoje", f"Quantos registos de {key.replace('_', ' ')} existem este mês?", f"Que acções posso preparar em {key.replace('_', ' ')}?"),
        examples_en=(f"Show {key.replace('_', ' ')} records for today", f"How many {key.replace('_', ' ')} records exist this month?", f"What actions can I prepare in {key.replace('_', ' ')}?"),
        aliases=(key.replace("_", " "),),
    )


def _humanize_module_name(key: str) -> str:
    words = [word.capitalize() for word in key.replace("_", " ").split()]
    return " ".join(words) or key


def _workflow_entries() -> list[KnowledgeEntry]:
    workflows = (
        ("clinical-to-nursing", "Como a enfermagem recebe requisições laboratoriais?", "Quando uma requisição laboratorial é criada, o fluxo deve notificar enfermagem e mostrar exames, amostra, frasco/tubo e volume mínimo para orientar a colheita."),
        ("consultation-reschedule", "Como reagendar consulta?", "A consulta pode ser reagendada pelo fluxo de consultas. O evento de reagendamento deve aparecer centralizado e acima da página para evitar dúvida do utilizador."),
        ("admin-activity", "Como ver actividade de admin?", "Use Monitoramento/Auditoria para rever pedidos recentes, página, resultado, tempo, utilizador e recurso. Se faltar dado, a origem é o registo UserActivity."),
        ("system-errors", "Como investigar erros do sistema?", "Pergunte por erros 4xx/5xx, rota, período ou módulo. A IA usa dados de monitoramento, actividade e erros do sistema quando o perfil tem acesso."),
        ("command-center", "O que é o Centro de comando?", "É a visão operacional para alertas, erros, SLO, outbox, tarefas e prioridades entre módulos."),
        ("footer-language", "Onde fica o botão de idioma?", "O botão de idioma deve ficar no rodapé, junto dos controlos globais, e persistir a escolha para as páginas seguintes."),
        ("sidebar", "Como ocultar o menu lateral?", "Use o botão hambúrguer do frontend para ocultar ou mostrar os módulos laterais; o layout e rodapé devem ocupar o espaço disponível."),
        ("education-healthcare", "Porque Education e Healthcare são separados?", "Após login, o sistema deve apresentar divisões principais para Education e Healthcare, evitando mistura de domínios para administradores."),
        ("lab-samples", "Como saber qual tubo usar no exame?", "Pergunte pela requisição ou exame. A IA deve mostrar exame, tipo de amostra, frasco/tubo e volume mínimo quando esses dados estiverem configurados."),
        ("audit-evidence", "O que são evidências da IA?", "Evidências são fontes internas usadas na resposta: ferramenta, modelo, rota, política RBAC, GitHub ou relatório gerado."),
        ("reception-queue", "Como acompanhar a fila da recepção?", "Pergunte por estado, prioridade, atendente ou tempo de espera. Exemplos úteis: 'Quantos check-ins estão na fila agora?', 'Quem está há mais tempo na fila?' e 'Resume a situação da recepção hoje'."),
        ("reception-checkin-billing", "Como saber se um check-in já tem fatura?", "Pergunte pelos check-ins sem fatura, por código, por período ou por estado. A IA deve responder em linguagem operacional, indicando pendências sem expor tabelas nem SQL."),
        ("reception-search", "Como procurar dados na recepção?", "Use paciente, código, estado, prioridade, atendente, requisição, fatura ou período. A IA deve interpretar estes termos como universo operacional da recepção."),
        ("request-create", "Como criar uma requisição laboratorial?", "Peça a criação da requisição com paciente, exames e origem. Se faltar paciente, exame, médico ou empresa, a IA deve pedir os campos em falta antes de preparar a acção."),
        ("request-external", "Como criar uma requisição externa?", "Indique empresa solicitante, paciente, exame e contexto externo. A IA deve separar a requisição externa da jornada normal e preparar a operação confirmável."),
        ("request-pending", "Como ver requisições pendentes?", "Pergunte por requisições pendentes com período, estado ou módulo. Exemplos: 'Mostre requisições pendentes de hoje' ou 'Quantas requisições aguardam validação?'"),
        ("consultation-schedule", "Como marcar consulta?", "Indique paciente, especialidade, médico e data prevista. A IA deve preparar a marcação, validar o fluxo e, se necessário, encaminhar para faturação antes da confirmação."),
        ("procedure-schedule", "Como marcar procedimento?", "Peça o procedimento com paciente, data, responsável e materiais quando existirem. A IA deve confirmar campos em falta e preparar a operação para confirmação."),
        ("billing-open-invoices", "Como ver faturas em aberto?", "Pergunte por faturas em aberto, emitidas, pagas ou pendentes com período e filtro por estado. A IA deve responder em resumo financeiro operacional."),
        ("billing-invoice-checkin", "Como ligar faturação à recepção?", "Pode perguntar por check-ins sem fatura, faturas por paciente, faturação do dia ou pendências de emissão para a recepção fechar o fluxo operacional."),
        ("payments-receipts", "Como consultar recibos?", "Pergunte por recibos de hoje, por paciente, por fatura ou por caixa. A IA deve localizar o universo de pagamentos e orientar a pesquisa com filtros simples."),
        ("payments-status", "Como ver pagamentos confirmados ou falhados?", "Pode pedir totais, valores confirmados, falhados, pendentes ou comparação por período, sem necessidade de conhecer o nome técnico da tabela."),
        ("pharmacy-expiry", "Como ver lotes expirados na farmácia?", "Pergunte por lotes expirados, válidos, próximos de expirar ou comparação entre válidos e expirados. A IA deve usar linguagem de stock e não de base de dados."),
        ("pharmacy-low-stock", "Como ver stock baixo ou ruptura?", "Indique produto, categoria ou período. Exemplos: 'Que produtos estão abaixo do mínimo?' e 'Mostre medicamentos em ruptura hoje'."),
        ("pharmacy-movements", "Como investigar movimentos de stock?", "Pergunte por produto, lote, período, tipo de movimento ou saldo histórico. A IA deve reconstruir a leitura operacional sem expor nomes de colunas."),
        ("audit-user-change", "Como saber quem alterou um registo?", "Pergunte pelo recurso, código, período ou utilizador. A IA deve orientar para Monitoramento ou Auditoria quando houver rastreabilidade disponível."),
        ("audit-page-access", "Como saber quem entrou numa página?", "Use perguntas por página, período, utilizador ou resultado. A IA deve consultar a actividade registada e resumir o acesso sem listar ruído técnico desnecessário."),
        ("user-groups", "Como funcionam os grupos de utilizadores?", "Os grupos definem o escopo operacional do utilizador. O perfil herdado do RH ou da função deve alinhar as páginas e módulos visíveis, como recepção, enfermagem, farmácia ou laboratório."),
        ("employee-role-match", "Porque o utilizador deve corresponder ao RH?", "O ideal é que o tipo de utilizador herde a função do funcionário em RH para alinhar permissões, páginas e responsabilidade operacional desde a criação da conta."),
        ("ai-clear-history", "Como limpar conversa ou histórico da IA?", "Na página da IA, a conversa actual pode ser limpa sem apagar todas as anteriores. Na vista de histórico, o sistema deve permitir limpar o histórico completo do utilizador."),
        ("ai-history", "Onde vejo o histórico de conversas da IA?", "A página da IA deve expor um botão de histórico com as sessões recentes. A partir daí, o utilizador pode reabrir uma conversa anterior ou iniciar uma nova."),
        ("report-operational-summary", "Como pedir um resumo operacional?", "Peça um resumo com módulo e período. Exemplos: 'Resume a situação da recepção hoje', 'Resumo financeiro desta semana' ou 'Como está o stock crítico agora?'"),
        ("navigation-workspace", "Como chegar ao módulo certo no sistema?", "Pode perguntar pelo módulo, página ou fluxo operacional. A IA deve orientar para recepção, consultas, faturamento, pagamentos, farmácia, enfermagem, laboratório e outros módulos existentes."),
        ("authorization-flow", "Como ver autorizações de procedimento?", "Pergunte por autorizações do dia, pendentes ou por paciente. A resposta deve falar de autorizações em linguagem operacional e não por nomes internos de modelos."),
        ("lab-critical-results", "Como ver resultados críticos?", "Pergunte por resultados críticos, período, paciente ou estado de alerta. A IA deve resumir os casos críticos e orientar o seguimento sem despejar linhas de tabela."),
        ("inventory-material-request", "Como criar requisição de materiais?", "Peça o material, quantidade, sector e urgência. A IA deve preparar a requisição para stock e pedir qualquer dado obrigatório em falta antes da confirmação."),
    )
    return [
        KnowledgeEntry(
            id=f"workflow-{key}",
            category="fluxos",
            questions_pt=(question, question.replace("Como", "De que forma"), question.replace("?", "")),
            answer_pt=answer,
            follow_ups_pt=("Que perguntas posso fazer?", "Como funcionam as permissões da IA?", "Gere relatório operacional dos últimos 30 dias."),
            tags=("fluxo", key),
        )
        for key, question, answer in workflows
    ]


def _answer_payload(*, entry: KnowledgeEntry, score: float, language: str, matched_question: str, tenant=None) -> dict[str, Any]:
    question = _main_question(entry, language=language)
    answer = entry.answer_en if language == "en" and entry.answer_en else entry.answer_pt
    follow_ups = list(entry.follow_ups_en if language == "en" and entry.follow_ups_en else entry.follow_ups_pt)
    total_entries = len(knowledge_entries(tenant=tenant))
    source_label = "AI editable knowledge base" if entry.source == "database" else "AI predicted questions"
    return {
        "summary": {
            "title_pt": "Resposta prevista da IA",
            "title_en": "Predicted AI answer",
            "metrics": [
                {"label_pt": "Perguntas previstas", "label_en": "Predicted questions", "value": total_entries},
                {"label_pt": "Confiança", "label_en": "Confidence", "value": round(score * 100)},
                {"label_pt": "Sugestões seguintes", "label_en": "Next suggestions", "value": len(follow_ups)},
            ],
            "knowledge_base": {
                "status": "answered",
                "question": question,
                "answer": answer,
                "category": entry.category,
                "score": round(score, 4),
                "matched_question": matched_question,
                "source": entry.source,
                "database_id": entry.database_id,
                "follow_ups": follow_ups[:5],
            },
        },
        "knowledge_base": {
            "status": "answered",
            "entry_id": entry.id,
            "question": question,
            "answer": answer,
            "category": entry.category,
            "score": round(score, 4),
            "matched_question": matched_question,
            "source": entry.source,
            "database_id": entry.database_id,
            "follow_ups": follow_ups[:5],
        },
        "sources": [{"type": "knowledge_base", "label": source_label, "href": ""}],
    }


def _suggestion_payload_result(*, language: str, suggestions: list[dict[str, Any]], score: float, message: str) -> dict[str, Any]:
    prompt = "Did you mean one of these questions?" if language == "en" else "Quis dizer uma destas perguntas?"
    return {
        "summary": {
            "title_pt": "Sugestões por ortografia aproximada",
            "title_en": "Approximate spelling suggestions",
            "metrics": [
                {"label_pt": "Sugestões", "label_en": "Suggestions", "value": len(suggestions)},
                {"label_pt": "Confiança", "label_en": "Confidence", "value": round(score * 100)},
            ],
            "knowledge_base": {
                "status": "needs_confirmation",
                "prompt": prompt,
                "original_message": message,
                "suggestions": suggestions,
            },
        },
        "knowledge_base": {
            "status": "needs_confirmation",
            "prompt": prompt,
            "original_message": message,
            "suggestions": suggestions,
        },
        "sources": [{"type": "knowledge_base", "label": "AI predicted questions", "href": ""}],
    }


def _suggestion_payload(entry: KnowledgeEntry, *, language: str, score: float) -> dict[str, Any]:
    return {
        "entry_id": entry.id,
        "question": _main_question(entry, language=language),
        "category": entry.category,
        "score": round(score, 4),
        "source": entry.source,
        "database_id": entry.database_id,
    }


def _main_question(entry: KnowledgeEntry, *, language: str) -> str:
    questions = entry.questions_en if language == "en" and entry.questions_en else entry.questions_pt
    return questions[0] if questions else entry.id


def _entry_score(*, entry: KnowledgeEntry, normalized: str) -> tuple[float, str]:
    candidates = (
        *entry.questions_pt,
        *entry.questions_en,
        *entry.aliases_pt,
        *entry.aliases_en,
        *entry.semantic_terms,
        *entry.tags,
    )
    best_score = 0.0
    best_question = ""
    for raw in candidates:
        candidate = normalize_text(raw)
        if not candidate:
            continue
        if normalized == candidate:
            return 1.0, raw
        if len(candidate) >= 8 and candidate in normalized:
            return 0.95, raw
        score = _similarity(normalized, candidate)
        if score > best_score:
            best_score = score
            best_question = raw
    return best_score, best_question


def _similarity(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    left_clean = _clean_for_similarity(left)
    right_clean = _clean_for_similarity(right)
    sequence = SequenceMatcher(None, left_clean, right_clean).ratio()
    left_tokens = set(left_clean.split())
    right_tokens = set(right_clean.split())
    token_overlap = len(left_tokens & right_tokens) / max(len(left_tokens | right_tokens), 1)
    compact_sequence = SequenceMatcher(None, left_clean.replace(" ", ""), right_clean.replace(" ", "")).ratio()
    left_semantic = _semantic_tokens(left_clean)
    right_semantic = _semantic_tokens(right_clean)
    semantic_overlap = len(left_semantic & right_semantic) / max(len(left_semantic | right_semantic), 1)
    return max(
        sequence * 0.48 + token_overlap * 0.24 + compact_sequence * 0.10 + semantic_overlap * 0.18,
        token_overlap,
        semantic_overlap * 0.92,
    )


def _module_boost(*, entry: KnowledgeEntry, active_module: str) -> float:
    active = normalize_text(active_module or "")
    if not active:
        return 0.0
    module_key = normalize_text(entry.module_key or "")
    if module_key and (active == module_key or module_key in active or active in module_key):
        return 0.04
    tags = {normalize_text(tag) for tag in entry.tags if tag}
    return 0.02 if active in tags else 0.0


def _clean_for_similarity(value: str) -> str:
    normalized = normalize_text(value)
    return re.sub(r"[^a-z0-9_ ]+", " ", normalized)


def _semantic_tokens(value: str) -> set[str]:
    tokens = set(value.split())
    semantic = set(tokens)
    for concept, terms in SEMANTIC_GROUPS.items():
        if any(term in tokens or term in value for term in terms):
            semantic.add(concept)
    return semantic


SEMANTIC_GROUPS: dict[str, tuple[str, ...]] = {
    "help": ("ajuda", "ajude", "como", "exemplo", "pergunta", "duvida", "help", "how", "what"),
    "patient": ("paciente", "doente", "utente", "patient", "cliente"),
    "create": ("criar", "crie", "registar", "registrar", "cadastrar", "novo", "nova", "inserir", "adicionar", "create", "add"),
    "update": ("alterar", "actualizar", "atualizar", "editar", "mudar", "update", "edit"),
    "delete": ("apagar", "remover", "eliminar", "delete", "remove"),
    "crud": ("crud", "criar", "alterar", "apagar", "registo", "registro"),
    "analytics": ("estatistica", "estatisticas", "indicador", "indicadores", "analytics", "calculo", "contagem"),
    "report": ("relatorio", "relatorios", "pdf", "exportar", "report", "export"),
    "permission": ("permissao", "permissoes", "acesso", "rbac", "privilegio", "privilegios", "permission"),
    "identity": ("autor", "criou", "criado", "github", "repositorio", "repository", "sistema", "projecto", "projeto"),
    "stock": ("stock", "estoque", "lote", "lotes", "medicacao", "medicamento", "farmacia", "pharmacy"),
    "billing": ("fatura", "faturas", "factura", "facturas", "billing", "faturamento"),
    "payment": ("pagamento", "pagamentos", "payment", "payments", "recebimento"),
    "education": ("estudante", "estudantes", "aluno", "alunos", "professor", "turma", "matricula", "matriculas", "education"),
    "clinical": ("clinico", "clinica", "exame", "exames", "consulta", "requisicao", "amostra", "sample"),
    "nursing": ("enfermagem", "enfermeiro", "colheita", "procedimento", "nursing"),
    "error": ("erro", "erros", "falha", "falhas", "4xx", "5xx", "exception", "error"),
    "language": ("idioma", "lingua", "portugues", "ingles", "translation", "language"),
}
