from __future__ import annotations

import argparse
import ast
import os
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

PORTUGUESE_TO_ENGLISH = {
    "acao": "action",
    "acoes": "actions",
    "adicionar": "add",
    "adiciona": "add",
    "agregados": "aggregates",
    "alterar": "change",
    "anonimizar": "anonymize",
    "apagado": "deleted",
    "apagar": "delete",
    "aplicacao": "application",
    "aplicar": "apply",
    "aprovacao": "approval",
    "aprovacoes": "approvals",
    "arquivos": "files",
    "artefatos": "artifacts",
    "assinantes": "subscribers",
    "atualizar": "update",
    "atendimento": "care",
    "auditoria": "audit",
    "autenticacao": "authentication",
    "autorizacao": "authorization",
    "banco": "database",
    "barramento": "bus",
    "calculo": "calculation",
    "calculos": "calculations",
    "campos": "fields",
    "canal": "channel",
    "canais": "channels",
    "categoria": "category",
    "categorias": "categories",
    "chave": "key",
    "chaves": "keys",
    "clinico": "clinical",
    "cobertura": "coverage",
    "codigo": "code",
    "codigos": "codes",
    "conciliar": "reconcile",
    "configuracao": "configuration",
    "configuracoes": "configurations",
    "confirmar": "confirm",
    "constantes": "constants",
    "consultamedica": "medicalconsultation",
    "consultar": "query",
    "controle": "control",
    "conversoes": "conversions",
    "coparticipacao": "copayment",
    "criar": "create",
    "criada": "created",
    "criado": "created",
    "criptografia": "cryptography",
    "dados": "data",
    "datas": "dates",
    "descricao": "description",
    "desconto": "discount",
    "descontos": "discounts",
    "desenvolvimento": "development",
    "dinheiro": "money",
    "documentacao": "documentation",
    "documento": "document",
    "documentos": "documents",
    "emitir": "issue",
    "endereco": "address",
    "enderecos": "addresses",
    "entrada": "entry",
    "entradas": "entries",
    "erro": "error",
    "erros": "errors",
    "escopo": "scope",
    "estoque": "inventory",
    "evento": "event",
    "eventos": "events",
    "exame": "exam",
    "exames": "exams",
    "excecao": "exception",
    "excecoes": "exceptions",
    "execucao": "execution",
    "exportar": "export",
    "extrair": "extract",
    "fatura": "invoice",
    "faturas": "invoices",
    "faturamento": "billing",
    "fila": "queue",
    "filtros": "filters",
    "financeiro": "financial",
    "fluxo": "flow",
    "funcao": "function",
    "funcoes": "functions",
    "funcionario": "employee",
    "funcionarios": "employees",
    "gerar": "generate",
    "gestacao": "pregnancy",
    "grupos": "groups",
    "grupo": "group",
    "groupos": "groups",
    "historico": "history",
    "hora": "time",
    "horas": "hours",
    "idempotencia": "idempotency",
    "idioma": "language",
    "idiomas": "languages",
    "identificador": "identifier",
    "identificadores": "identifiers",
    "inquilino": "tenant",
    "inquilinos": "tenants",
    "integracoes": "integrations",
    "interpretacao": "interpretation",
    "interpretador": "interpreter",
    "laboratorio": "laboratory",
    "lancamento": "entry",
    "lancamentos": "entries",
    "legado": "legacy",
    "liquidacao": "settlement",
    "limitacao": "limiting",
    "listar": "list",
    "manipuladores": "handlers",
    "medica": "medical",
    "medico": "doctor",
    "medicos": "doctors",
    "metodo": "method",
    "metodos": "methods",
    "metricas": "metrics",
    "migracoes": "migrations",
    "modelo": "model",
    "modelos": "models",
    "monitoramento": "monitoring",
    "motor": "engine",
    "movimento": "movement",
    "movimentos": "movements",
    "nome": "name",
    "nomes": "names",
    "notificacao": "notification",
    "notificacoes": "notifications",
    "objetos": "objects",
    "objeto": "object",
    "observabilidade": "observability",
    "obter": "get",
    "ordem": "order",
    "paciente": "patient",
    "pacientes": "patients",
    "pagamento": "payment",
    "pagamentos": "payments",
    "pais": "country",
    "particionamento": "partitioning",
    "passos": "steps",
    "perfil": "profile",
    "perfis": "profiles",
    "permissao": "permission",
    "permissoes": "permissions",
    "pesquisa": "search",
    "plano": "plan",
    "planos": "plans",
    "plataforma": "platform",
    "politicas": "policies",
    "precificacao": "pricing",
    "processar": "process",
    "propriedades": "properties",
    "proveniencia": "provenance",
    "proximos": "next",
    "publicador": "publisher",
    "razao": "ledger",
    "rastreamento": "tracking",
    "recepcao": "reception",
    "recibo": "receipt",
    "recalcular": "recalculate",
    "recalculo": "recalculation",
    "reconciliar": "reconcile",
    "reembolsar": "refund",
    "referencia": "reference",
    "regras": "rules",
    "registrar": "register",
    "registro": "record",
    "registros": "records",
    "relatorio": "report",
    "relatorios": "reports",
    "reparar": "repair",
    "requisicao": "request",
    "requisicoes": "requests",
    "resetar": "reset",
    "resposta": "response",
    "respostas": "responses",
    "resultado": "result",
    "resultados": "results",
    "reverter": "reverse",
    "revisao": "review",
    "roteador": "router",
    "saida": "output",
    "saidas": "outputs",
    "saldo": "balance",
    "sanitizacao": "sanitization",
    "saude": "health",
    "seguradora": "insurer",
    "seguro": "insurance",
    "selecionar": "select",
    "serializacao": "serialization",
    "servico": "service",
    "servicos": "services",
    "setor": "sector",
    "sistema": "system",
    "solicitar": "request",
    "tarefas": "tasks",
    "telefone": "phone",
    "tempo": "time",
    "tipos": "types",
    "tipo": "type",
    "todos": "all",
    "trabalho": "work",
    "transacao": "transaction",
    "transacoes": "transactions",
    "unidade": "unit",
    "unidades": "units",
    "usuario": "user",
    "usuarios": "users",
    "uteis": "utils",
    "utilitario": "utility",
    "utilitarios": "utilities",
    "validacao": "validation",
    "validada": "validated",
    "validado": "validated",
    "validacoes": "validations",
    "validadores": "validators",
    "validar": "validate",
    "valor": "value",
    "valores": "values",
    "verificacao": "verification",
    "verificar": "verify",
    "versionamento": "versioning",
}

EXCLUDED_NAMES = {
    ".git",
    ".idea",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "media",
    "node_modules",
    "staticfiles",
    "venv",
}


@dataclass(frozen=True, slots=True)
class NamingFinding:
    kind: str
    path: Path
    identifier: str
    matched_tokens: tuple[str, ...]
    line: int | None = None

    def format(self, root: Path) -> str:
        relative_path = self.path.relative_to(root).as_posix()
        location = f"{relative_path}:{self.line}" if self.line else relative_path
        suggestions = ", ".join(
            f"{token}->{PORTUGUESE_TO_ENGLISH[token]}"
            for token in self.matched_tokens
            if token in PORTUGUESE_TO_ENGLISH
        )
        suffix = f" | suggestions: {suggestions}" if suggestions else ""
        tokens = ", ".join(self.matched_tokens)
        return f"{self.kind}: {location} -> {self.identifier} [{tokens}]{suffix}"


def normalize_token(token: str) -> str:
    normalized = unicodedata.normalize("NFKD", token)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return ascii_only.lower()


def split_identifier(value: str) -> list[str]:
    expanded = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", value)
    pieces = re.split(r"[^A-Za-z0-9]+", expanded)
    return [normalize_token(piece) for piece in pieces if piece and not piece.isdigit()]


def find_portuguese_tokens(value: str) -> tuple[str, ...]:
    matched = {token for token in split_identifier(value) if token in PORTUGUESE_TO_ENGLISH}
    return tuple(sorted(matched))


def iter_repository_entries(root: Path):
    for current_root, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(name for name in dirnames if name not in EXCLUDED_NAMES)
        current_path = Path(current_root)

        for dirname in dirnames:
            yield current_path / dirname, True

        for filename in sorted(filenames):
            yield current_path / filename, False


def scan_paths(root: Path) -> list[NamingFinding]:
    findings: list[NamingFinding] = []

    for entry, is_dir in iter_repository_entries(root):
        name = entry.name if is_dir else entry.stem
        matched_tokens = find_portuguese_tokens(name)

        if matched_tokens:
            findings.append(
                NamingFinding(
                    kind="directory" if is_dir else "file",
                    path=entry,
                    identifier=entry.name,
                    matched_tokens=matched_tokens,
                )
            )

    return findings


class IdentifierVisitor(ast.NodeVisitor):
    def __init__(self, source_path: Path) -> None:
        self.source_path = source_path
        self.findings: list[NamingFinding] = []

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._record("function", node.name, node.lineno)
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self._record("class", node.name, node.lineno)
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._record("function", node.name, node.lineno)
        self.generic_visit(node)

    def _record(self, kind: str, identifier: str, line: int) -> None:
        if identifier.startswith("__") and identifier.endswith("__"):
            return

        matched_tokens = find_portuguese_tokens(identifier)
        if not matched_tokens:
            return

        self.findings.append(
            NamingFinding(
                kind=kind,
                path=self.source_path,
                identifier=identifier,
                matched_tokens=matched_tokens,
                line=line,
            )
        )


def scan_python_identifiers(root: Path) -> list[NamingFinding]:
    findings: list[NamingFinding] = []

    for entry, is_dir in iter_repository_entries(root):
        if is_dir or entry.suffix != ".py":
            continue

        try:
            source = entry.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            source = entry.read_text(encoding="utf-8", errors="ignore")

        try:
            parsed = ast.parse(source, filename=str(entry))
        except SyntaxError as error:
            findings.append(
                NamingFinding(
                    kind="syntax",
                    path=entry,
                    identifier="unable_to_parse_python_file",
                    matched_tokens=(),
                    line=error.lineno,
                )
            )
            continue

        visitor = IdentifierVisitor(entry)
        visitor.visit(parsed)
        findings.extend(visitor.findings)

    return findings


def scan_repository(root: Path) -> list[NamingFinding]:
    findings = [*scan_paths(root), *scan_python_identifiers(root)]
    return sorted(findings, key=lambda item: (item.path.as_posix(), item.line or 0, item.kind, item.identifier))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Audit repository names and Python identifiers for Portuguese terms.",
    )
    parser.add_argument(
        "--root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Repository root to scan. Defaults to the current project root.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximum number of findings to print before truncating the report.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    root = Path(args.root).resolve()

    findings = scan_repository(root)
    if not findings:
        print("No Portuguese naming violations found.")
        return 0

    print(f"Found {len(findings)} Portuguese naming violations in {root}.")

    visible_findings = findings[: args.limit]
    for finding in visible_findings:
        print(f" - {finding.format(root)}")

    remaining = len(findings) - len(visible_findings)
    if remaining > 0:
        print(f" - ... {remaining} more findings not shown")

    return 1


if __name__ == "__main__":
    sys.exit(main())
