from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.ai_assistant.services.phase1_audit import (
    build_phase1_ai_audit,
    render_phase1_ai_audit_markdown,
    render_phase1_ai_audit_text,
)


class Command(BaseCommand):
    help = "Gera a auditoria da fase 1 da IA operacional."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--format",
            choices=["text", "json", "markdown"],
            default="text",
            help="Formato de saída da auditoria.",
        )
        parser.add_argument(
            "--output",
            default="",
            help="Caminho opcional para gravar a auditoria gerada.",
        )

    def handle(self, *args, **options):
        audit = build_phase1_ai_audit()
        output_format = options["format"]

        if output_format == "json":
            content = json.dumps(audit, ensure_ascii=False, indent=2)
        elif output_format == "markdown":
            content = render_phase1_ai_audit_markdown(audit)
        else:
            content = render_phase1_ai_audit_text(audit)

        output_path = str(options.get("output") or "").strip()
        if output_path:
            path = Path(output_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Auditoria da IA gravada em {path}"))
            return

        self.stdout.write(content)
