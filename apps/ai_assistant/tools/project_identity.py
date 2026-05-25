from __future__ import annotations

import json
from pathlib import Path
import re
import subprocess
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

from apps.ai_assistant.tools.resource_catalog import normalize_text

from .base import AiTool, AiToolContext


class ProjectIdentityTool(AiTool):
    name = "get_project_identity"
    description_pt = "Responde sobre autoria, origem e início do desenvolvimento usando dados do GitHub."
    description_en = "Answers authorship, origin and development start questions using GitHub data."
    required_groups: tuple[str, ...] = ()
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        metadata = self._load_metadata()
        repository = metadata.get("repository") or {}
        first_commit = metadata.get("first_commit") or {}
        creator = metadata.get("creator") or {}
        return {
            "summary": {
                "title_pt": "Identidade do sistema no GitHub",
                "title_en": "System identity on GitHub",
                "metrics": [
                    {
                        "label_pt": "Repositório",
                        "label_en": "Repository",
                        "value": repository.get("full_name") or repository.get("html_url") or "—",
                    },
                    {
                        "label_pt": "Proprietário GitHub",
                        "label_en": "GitHub owner",
                        "value": repository.get("owner_login") or "—",
                    },
                    {
                        "label_pt": "Autor do primeiro commit",
                        "label_en": "First commit author",
                        "value": creator.get("name") or first_commit.get("author_name") or "—",
                    },
                    {
                        "label_pt": "Início no GitHub",
                        "label_en": "Start on GitHub",
                        "value": first_commit.get("date") or repository.get("created_at") or "—",
                    },
                ],
                "project_identity": metadata,
            },
            "project_identity": metadata,
            "sources": _sources(metadata),
        }

    def _load_metadata(self) -> dict[str, Any]:
        return load_project_identity_metadata()


def should_select_project_identity(*, message: str, active_module: str = "") -> bool:
    normalized = normalize_text(f"{message or ''} {active_module or ''}")
    if not any(term in normalized for term in ("sistema", "projecto", "projeto", "substrato", "software", "app", "plataforma", "system", "project")):
        return False
    return any(
        term in normalized
        for term in (
            "quem criou",
            "quem desenvolveu",
            "criador",
            "criado por",
            "autor",
            "dono",
            "proprietario",
            "proprietário",
            "quando comecou",
            "quando começou",
            "quando iniciou",
            "inicio do desenvolvimento",
            "início do desenvolvimento",
            "github",
            "repositorio",
            "repositório",
            "repository",
            "who created",
            "who built",
            "owner",
            "creator",
            "started development",
        )
    )


def load_project_identity_metadata() -> dict[str, Any]:
    repo_root = _repo_root()
    remote_url = _git(["remote", "get-url", "origin"], cwd=repo_root)
    latest_commit = _local_commit(["log", "-1", "--format=%H%x09%an%x09%ae%x09%aI%x09%s"], cwd=repo_root)
    local_first_commit = _local_commit(["log", "--reverse", "--format=%H%x09%an%x09%ae%x09%aI%x09%s", "--max-count=1"], cwd=repo_root)
    owner, repo = _parse_github_repo(remote_url)

    github_payload: dict[str, Any] = {}
    github_first_commit: dict[str, Any] = {}
    github_error = ""
    if owner and repo:
        try:
            github_payload = _github_json(f"https://api.github.com/repos/{owner}/{repo}")[0]
            github_first_commit = _github_first_commit(owner=owner, repo=repo)
        except (OSError, TimeoutError, URLError, ValueError, json.JSONDecodeError) as exc:
            github_error = str(exc)

    first_commit = github_first_commit or local_first_commit
    repository = {
        "full_name": github_payload.get("full_name") or (f"{owner}/{repo}" if owner and repo else ""),
        "owner_login": ((github_payload.get("owner") or {}).get("login") if isinstance(github_payload.get("owner"), dict) else "") or owner,
        "html_url": github_payload.get("html_url") or (f"https://github.com/{owner}/{repo}" if owner and repo else remote_url),
        "created_at": github_payload.get("created_at") or "",
        "default_branch": github_payload.get("default_branch") or "",
        "remote_url": remote_url,
        "data_source": "github_api" if github_payload else "local_git",
        "github_error": github_error,
    }
    creator = {
        "name": first_commit.get("author_name") or "",
        "email": first_commit.get("author_email") or "",
        "login": first_commit.get("author_login") or repository.get("owner_login") or "",
        "profile_url": first_commit.get("author_html_url") or (f"https://github.com/{repository.get('owner_login')}" if repository.get("owner_login") else ""),
    }
    return {
        "repository": repository,
        "creator": creator,
        "first_commit": first_commit,
        "latest_commit": latest_commit,
        "evidence": {
            "primary": "GitHub API" if github_payload else "local git remote/log",
            "limitation_pt": "Se o trabalho tiver começado fora do GitHub antes do primeiro commit público, essa data não aparece nestes dados.",
            "limitation_en": "If work started outside GitHub before the first public commit, that date is not visible in these data.",
        },
    }


def _github_first_commit(*, owner: str, repo: str) -> dict[str, Any]:
    commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=1"
    commits, headers = _github_json(commits_url)
    if not isinstance(commits, list):
        return {}
    oldest_url = _last_page_url(headers.get("Link", "")) or commits_url
    oldest_commits, _headers = _github_json(oldest_url)
    if not isinstance(oldest_commits, list) or not oldest_commits:
        return {}
    return _github_commit_payload(oldest_commits[0])


def _github_json(url: str) -> tuple[Any, dict[str, str]]:
    request = Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "substrato-ai-project-identity",
        },
    )
    with urlopen(request, timeout=4) as response:
        payload = json.loads(response.read().decode("utf-8"))
        return payload, dict(response.headers.items())


def _last_page_url(link_header: str) -> str:
    for part in (link_header or "").split(","):
        if 'rel="last"' not in part:
            continue
        match = re.search(r"<([^>]+)>", part)
        if match:
            return match.group(1)
    return ""


def _github_commit_payload(item: dict[str, Any]) -> dict[str, Any]:
    commit = item.get("commit") or {}
    author = commit.get("author") or {}
    github_author = item.get("author") or {}
    return {
        "sha": item.get("sha") or "",
        "short_sha": str(item.get("sha") or "")[:12],
        "message": commit.get("message") or "",
        "date": author.get("date") or "",
        "author_name": author.get("name") or "",
        "author_email": author.get("email") or "",
        "author_login": github_author.get("login") or "",
        "author_html_url": github_author.get("html_url") or "",
        "html_url": item.get("html_url") or "",
        "data_source": "github_api",
    }


def _local_commit(args: list[str], *, cwd: Path) -> dict[str, Any]:
    raw = _git(args, cwd=cwd)
    if not raw:
        return {}
    parts = raw.split("\t", 4)
    while len(parts) < 5:
        parts.append("")
    sha, author_name, author_email, date_value, message = parts
    return {
        "sha": sha,
        "short_sha": sha[:12],
        "message": message,
        "date": date_value,
        "author_name": author_name,
        "author_email": author_email,
        "author_login": "",
        "author_html_url": "",
        "html_url": "",
        "data_source": "local_git",
    }


def _git(args: list[str], *, cwd: Path) -> str:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=str(cwd),
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    if completed.returncode != 0:
        return ""
    return (completed.stdout or "").strip()


def _repo_root() -> Path:
    current = Path(__file__).resolve()
    for parent in current.parents:
        if (parent / ".git").exists():
            return parent
    return Path.cwd()


def _parse_github_repo(remote_url: str) -> tuple[str, str]:
    value = (remote_url or "").strip()
    patterns = (
        r"github\.com[:/](?P<owner>[^/\s:]+)/(?P<repo>[^/\s]+?)(?:\.git)?$",
        r"^https?://github\.com/(?P<owner>[^/\s]+)/(?P<repo>[^/\s]+?)(?:\.git)?$",
    )
    for pattern in patterns:
        match = re.search(pattern, value)
        if match:
            return match.group("owner"), match.group("repo").removesuffix(".git")
    return "", ""


def _sources(metadata: dict[str, Any]) -> list[dict[str, str]]:
    repository = metadata.get("repository") or {}
    first_commit = metadata.get("first_commit") or {}
    sources = []
    if repository.get("html_url"):
        sources.append({"type": "github", "label": "GitHub repository", "href": str(repository["html_url"])})
    if first_commit.get("html_url"):
        sources.append({"type": "github_commit", "label": "First commit on GitHub", "href": str(first_commit["html_url"])})
    sources.append({"type": "git", "label": str(repository.get("data_source") or "Git metadata"), "href": ""})
    return sources
