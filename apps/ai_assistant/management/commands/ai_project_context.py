from __future__ import annotations

import json

from django.core.management.base import BaseCommand, CommandError

from apps.ai_assistant.services.project_context import (
    build_project_context_payload,
    iter_project_files,
    load_project_agents,
    load_project_decisions,
    load_project_memory,
)


class Command(BaseCommand):
    help = "Inspect the AI project-specialist context layer."

    def add_arguments(self, parser) -> None:
        parser.add_argument("action", choices=["info", "search", "memory", "agents", "decisions"])
        parser.add_argument("--query", default="", help="Project question for search action.")
        parser.add_argument("--active-module", default="", help="Optional active module hint.")
        parser.add_argument("--json", action="store_true", help="Return raw JSON.")

    def handle(self, *args, **options) -> None:
        action = options["action"]
        if action == "info":
            payload = {"indexed_files": len(iter_project_files())}
        elif action == "memory":
            payload = load_project_memory()
        elif action == "agents":
            payload = load_project_agents()
        elif action == "decisions":
            payload = {"decisions": load_project_decisions()}
        elif action == "search":
            query = str(options.get("query") or "").strip()
            if not query:
                raise CommandError("--query is required for search")
            payload = build_project_context_payload(query=query, active_module=options.get("active_module") or "")
        else:
            raise CommandError(f"Unsupported action: {action}")

        if options["json"]:
            self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2, default=str))
            return

        self.stdout.write(self.style.SUCCESS("AI project context"))
        if action == "search":
            context = payload.get("project_context") or {}
            self.stdout.write(f"Matches: {len(context.get('matches') or [])}")
            for match in context.get("matches") or []:
                self.stdout.write(f"- {match['path']}:{match['line_start']} score={match['score']}")
            return
        self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2, default=str))
