from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.ai_assistant.services.alias_normalization import (
    build_alias_normalization_report,
    render_alias_normalization_markdown,
    render_alias_normalization_text,
)


class Command(BaseCommand):
    help = "Gera a auditoria da fase 3 de aliases e normalizacao da IA."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--format",
            choices=["text", "json", "markdown"],
            default="text",
            help="Formato de saida da auditoria.",
        )
        parser.add_argument(
            "--output",
            default="",
            help="Caminho opcional para gravar a auditoria gerada.",
        )

    def handle(self, *args, **options):
        report = build_alias_normalization_report()
        output_format = options["format"]

        if output_format == "json":
            content = json.dumps(report, ensure_ascii=False, indent=2)
        elif output_format == "markdown":
            content = render_alias_normalization_markdown(report)
        else:
            content = render_alias_normalization_text(report)

        output_path = str(options.get("output") or "").strip()
        if output_path:
            path = Path(output_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Auditoria de aliases da IA gravada em {path}"))
            return

        self.stdout.write(content)
