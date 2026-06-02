from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import re
from typing import Any

from django.conf import settings
import yaml

PROJECT_MEMORY_PATH = Path("docs/ai/project_memory.md")
AGENTS_CONFIG_PATH = Path("docs/ai/agents.yaml")
DECISIONS_DIR = Path("docs/ai/decisions")

ALLOWED_FILE_NAMES = {
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.prod.yml",
    "requirements.txt",
    "pyproject.toml",
    "pytest.ini",
    "package.json",
    "next.config.js",
    "tsconfig.json",
}
ALLOWED_SUFFIXES = {".md", ".py", ".ts", ".tsx", ".js", ".json", ".yml", ".yaml", ".txt"}
SEARCH_ROOTS = (
    "docs",
    "apps/ai_assistant",
    "platform",
    "api",
    "security",
    "frontend-next/app/ai",
    "frontend-next/components/ai",
    "frontend-next/lib",
)
SKIP_DIRS = {
    ".git",
    ".next",
    ".next-dev",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "migrations",
    "node_modules",
    "staticfiles",
}
SKIP_PATH_PARTS = {
    "frontend-next/lib/api-client",
}
MAX_FILE_BYTES = 260_000
MAX_CHUNK_LINES = 18
MAX_CHARS_PER_EXCERPT = 1_200


@dataclass(frozen=True, slots=True)
class ProjectContextMatch:
    path: str
    kind: str
    title: str
    line_start: int
    line_end: int
    score: float
    excerpt: str

    def as_payload(self) -> dict[str, Any]:
        return {
            "path": self.path,
            "kind": self.kind,
            "title": self.title,
            "line_start": self.line_start,
            "line_end": self.line_end,
            "score": round(self.score, 3),
            "excerpt": self.excerpt,
        }


def build_project_context_payload(
    *,
    query: str,
    active_module: str = "",
    limit: int = 6,
) -> dict[str, Any]:
    """Build a read-only project specialist context from docs, memory and code."""

    normalized_query = _normalize(query)
    matches = search_project_context(query=query, active_module=active_module, limit=limit)
    memory = load_project_memory()
    agents = select_project_agents(query=query, active_module=active_module, limit=3)
    decisions = load_project_decisions(limit=6)
    docs_status = _docs_status()

    return {
        "project_context": {
            "status": "ready" if matches else "limited",
            "query": query,
            "normalized_query": normalized_query,
            "active_module": active_module,
            "memory": memory,
            "agents": agents,
            "decisions": decisions,
            "matches": [match.as_payload() for match in matches],
            "docs_status": docs_status,
            "guardrails": [
                "Responder apenas com base em ficheiros, documentação, memória e decisões encontrados.",
                "Sugerir alterações sem executar escrita automática.",
                "Exigir confirmação humana para ações destrutivas, migrations, deploy e alteração de permissões.",
                "Indicar limitações quando o contexto encontrado for insuficiente.",
            ],
            "recommended_actions": _recommended_actions(matches=matches, query=query, agents=agents),
        },
        "summary": {
            "project_context": {
                "match_count": len(matches),
                "agent_count": len(agents),
                "decision_count": len(decisions),
                "top_paths": [match.path for match in matches[:5]],
            }
        },
        "sources": _sources(matches=matches, include_static=True),
    }


def search_project_context(*, query: str, active_module: str = "", limit: int = 6) -> list[ProjectContextMatch]:
    terms = _query_terms(query=query, active_module=active_module)
    if not terms:
        terms = tuple(_normalize(active_module).split())
    if not terms:
        return []

    matches: list[ProjectContextMatch] = []
    for file_path in iter_project_files():
        content = _read_text(file_path)
        if not content:
            continue
        relative = _relative_path(file_path)
        file_score = _score_text(relative, terms) * 2.0
        for chunk in _chunks(relative=relative, content=content):
            score = file_score + _score_text(chunk["search_text"], terms)
            if score <= 0:
                continue
            matches.append(
                ProjectContextMatch(
                    path=relative,
                    kind=_kind_for_path(relative),
                    title=chunk["title"],
                    line_start=chunk["line_start"],
                    line_end=chunk["line_end"],
                    score=score,
                    excerpt=_trim_excerpt(chunk["text"]),
                )
            )

    matches.sort(key=lambda item: (-item.score, item.path, item.line_start))
    deduped: list[ProjectContextMatch] = []
    seen_paths: set[str] = set()
    for match in matches:
        key = f"{match.path}:{match.line_start}:{match.line_end}"
        if key in seen_paths:
            continue
        seen_paths.add(key)
        deduped.append(match)
        if len(deduped) >= max(1, limit):
            break
    return deduped


def load_project_memory() -> dict[str, Any]:
    path = _repo_root() / PROJECT_MEMORY_PATH
    content = _read_text(path)
    return {
        "path": str(PROJECT_MEMORY_PATH),
        "available": bool(content),
        "excerpt": _trim_excerpt(content, max_chars=1_500) if content else "",
    }


def load_project_agents() -> dict[str, Any]:
    path = _repo_root() / AGENTS_CONFIG_PATH
    content = _read_text(path)
    if not content:
        return {"available": False, "agents": {}}
    try:
        parsed = yaml.safe_load(content) or {}
    except yaml.YAMLError as exc:
        return {"available": False, "error": str(exc), "agents": {}}
    agents = parsed.get("agents") if isinstance(parsed, dict) else {}
    return {"available": isinstance(agents, dict), "agents": agents or {}}


def select_project_agents(*, query: str, active_module: str = "", limit: int = 3) -> list[dict[str, Any]]:
    config = load_project_agents()
    agents = config.get("agents") or {}
    if not isinstance(agents, dict):
        return []
    terms = set(_query_terms(query=query, active_module=active_module))
    ranked: list[tuple[float, str, dict[str, Any]]] = []
    for key, raw_agent in agents.items():
        if not isinstance(raw_agent, dict):
            continue
        searchable = " ".join(
            [
                str(key),
                str(raw_agent.get("role") or ""),
                " ".join(str(item) for item in raw_agent.get("responsibilities") or []),
                " ".join(str(item) for item in raw_agent.get("keywords") or []),
            ]
        )
        score = _score_text(searchable, tuple(terms)) if terms else 0
        if key == "architect":
            score += 0.25
        if key == "backend" and any(term in terms for term in {"api", "backend", "django", "model", "models"}):
            score += 2
        if key == "frontend" and any(term in terms for term in {"frontend", "next", "react", "tsx", "tela"}):
            score += 2
        if score <= 0 and key not in {"architect", "backend"}:
            continue
        ranked.append((score, str(key), raw_agent))
    ranked.sort(key=lambda item: (-item[0], item[1]))
    selected = ranked[: max(1, limit)] or [(1.0, "architect", agents.get("architect") or {})]
    return [
        {
            "key": key,
            "role": str(agent.get("role") or key),
            "responsibilities": list(agent.get("responsibilities") or [])[:8],
            "guardrails": list(agent.get("guardrails") or [])[:6],
            "score": round(score, 3),
        }
        for score, key, agent in selected
        if isinstance(agent, dict)
    ]


def load_project_decisions(*, limit: int = 6) -> list[dict[str, Any]]:
    root = _repo_root() / DECISIONS_DIR
    if not root.exists():
        return []
    decisions = []
    for path in sorted(root.glob("ADR-*.md"), reverse=True):
        content = _read_text(path)
        if not content:
            continue
        decisions.append(
            {
                "path": _relative_path(path),
                "title": _title_for_content(content, fallback=path.stem),
                "excerpt": _trim_excerpt(content, max_chars=800),
            }
        )
        if len(decisions) >= limit:
            break
    return decisions


def iter_project_files() -> list[Path]:
    root = _repo_root()
    files: list[Path] = []
    for search_root in SEARCH_ROOTS:
        root_path = root / search_root
        if root_path.is_file():
            files.append(root_path)
            continue
        if not root_path.exists():
            continue
        for path in root_path.rglob("*"):
            if _should_index(path):
                files.append(path)
    for name in ALLOWED_FILE_NAMES:
        path = root / name
        if path.exists() and path.is_file():
            files.append(path)
    unique = sorted({path.resolve() for path in files})
    return [Path(path) for path in unique]


def _recommended_actions(
    *,
    matches: list[ProjectContextMatch],
    query: str,
    agents: list[dict[str, Any]],
) -> list[dict[str, str]]:
    actions = []
    if matches:
        actions.append(
            {
                "type": "review_sources",
                "label_pt": "Rever os ficheiros encontrados antes de alterar código.",
                "label_en": "Review the matched files before changing code.",
            }
        )
    if agents:
        actions.append(
            {
                "type": "route_to_agent",
                "label_pt": f"Usar o agente {agents[0].get('role')} como lente principal.",
                "label_en": f"Use the {agents[0].get('role')} agent as the primary lens.",
            }
        )
    if re.search(r"\b(teste|testes|test|tests|validar|validate)\b", query or "", flags=re.IGNORECASE):
        actions.append(
            {
                "type": "plan_tests",
                "label_pt": "Preparar validações antes de executar comandos.",
                "label_en": "Plan validations before running commands.",
            }
        )
    return actions


def _sources(*, matches: list[ProjectContextMatch], include_static: bool = False) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    if include_static:
        for path, label in (
            (PROJECT_MEMORY_PATH, "Memória do Projeto"),
            (AGENTS_CONFIG_PATH, "Configuração dos Agentes"),
        ):
            if (_repo_root() / path).exists():
                sources.append({"type": "project_memory", "label": label, "href": str(path)})
    for match in matches:
        sources.append(
            {
                "type": match.kind,
                "label": f"{match.path}:{match.line_start}",
                "href": match.path,
            }
        )
    return sources


def _docs_status() -> dict[str, Any]:
    root = _repo_root()
    expected = [
        "docs/backend/architecture.md",
        "docs/backend/module_catalog.md",
        "docs/frontend/architecture.md",
        "docs/roadmap_2026.md",
        "docs/security_baseline.md",
        str(PROJECT_MEMORY_PATH),
        str(AGENTS_CONFIG_PATH),
    ]
    return {
        "expected": expected,
        "available": [path for path in expected if (root / path).exists()],
        "missing": [path for path in expected if not (root / path).exists()],
    }


def _chunks(*, relative: str, content: str) -> list[dict[str, Any]]:
    lines = content.splitlines()
    if not lines:
        return []
    chunks = []
    current_title = _title_for_content(content, fallback=relative)
    for start in range(0, len(lines), MAX_CHUNK_LINES):
        chunk_lines = lines[start : start + MAX_CHUNK_LINES]
        title = next((line.strip("# ").strip() for line in chunk_lines if line.strip().startswith("#")), current_title)
        text = "\n".join(chunk_lines).strip()
        if not text:
            continue
        chunks.append(
            {
                "title": title or current_title,
                "line_start": start + 1,
                "line_end": start + len(chunk_lines),
                "text": text,
                "search_text": f"{relative}\n{title}\n{text}",
            }
        )
    return chunks


def _score_text(text: str, terms: tuple[str, ...]) -> float:
    normalized = _normalize(text)
    if not normalized:
        return 0.0
    score = 0.0
    for term in terms:
        if not term:
            continue
        if len(term) <= 2:
            continue
        occurrences = len(re.findall(rf"(?<!\w){re.escape(term)}(?!\w)", normalized))
        if occurrences:
            score += min(occurrences, 6)
        elif term in normalized and len(term) > 4:
            score += 0.5
    return score


def _query_terms(*, query: str, active_module: str = "") -> tuple[str, ...]:
    normalized = _normalize(f"{query or ''} {active_module or ''}")
    terms = []
    for token in normalized.split():
        if len(token) < 3 or token in _stopwords():
            continue
        terms.append(token)
    phrase_terms = []
    for phrase in ("clean architecture", "service layer", "repository pattern", "command center", "ai assistant"):
        normalized_phrase = _normalize(phrase)
        if normalized_phrase in normalized:
            phrase_terms.extend(normalized_phrase.split())
    return tuple(dict.fromkeys([*terms, *phrase_terms]))


@lru_cache(maxsize=1)
def _stopwords() -> set[str]:
    return {
        "como",
        "funciona",
        "funcionam",
        "qual",
        "quais",
        "onde",
        "para",
        "por",
        "que",
        "com",
        "sem",
        "uma",
        "um",
        "dos",
        "das",
        "este",
        "esta",
        "esse",
        "essa",
        "the",
        "and",
        "for",
        "with",
        "how",
        "what",
        "where",
    }


def _should_index(path: Path) -> bool:
    if not path.is_file():
        return False
    parts = set(path.parts)
    if parts & SKIP_DIRS:
        return False
    relative = _relative_path(path)
    if any(skip in relative for skip in SKIP_PATH_PARTS):
        return False
    if path.name not in ALLOWED_FILE_NAMES and path.suffix.lower() not in ALLOWED_SUFFIXES:
        return False
    try:
        if path.stat().st_size > MAX_FILE_BYTES:
            return False
    except OSError:
        return False
    return True


def _kind_for_path(path: str) -> str:
    if path.startswith("docs/ai/decisions/"):
        return "project_decision"
    if path.startswith("docs/"):
        return "documentation"
    if path.endswith((".py", ".ts", ".tsx", ".js")):
        return "code"
    if path.endswith((".yml", ".yaml", ".json", ".toml")) or path in ALLOWED_FILE_NAMES:
        return "configuration"
    return "project_context"


def _title_for_content(content: str, *, fallback: str) -> str:
    for line in content.splitlines()[:20]:
        stripped = line.strip()
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip() or fallback
    return fallback


def _trim_excerpt(text: str, *, max_chars: int = MAX_CHARS_PER_EXCERPT) -> str:
    normalized = re.sub(r"\n{3,}", "\n\n", (text or "").strip())
    if len(normalized) <= max_chars:
        return normalized
    return normalized[: max_chars - 1].rstrip() + "…"


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            return path.read_text(encoding="latin-1")
        except OSError:
            return ""
    except OSError:
        return ""


def _relative_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(_repo_root()))
    except ValueError:
        return str(path)


def _normalize(value: str) -> str:
    text = (value or "").lower()
    replacements = {
        "á": "a",
        "à": "a",
        "â": "a",
        "ã": "a",
        "é": "e",
        "ê": "e",
        "í": "i",
        "ó": "o",
        "ô": "o",
        "õ": "o",
        "ú": "u",
        "ç": "c",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return re.sub(r"[^a-z0-9_./-]+", " ", text).strip()


@lru_cache(maxsize=1)
def _repo_root() -> Path:
    return Path(settings.BASE_DIR).resolve()
