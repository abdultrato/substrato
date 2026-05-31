from __future__ import annotations

import json

from django.core.management.base import BaseCommand

from apps.ai_assistant.services.understanding_trace import (
    build_phase20_understanding_trace_report,
    render_phase20_understanding_trace_markdown,
    render_phase20_understanding_trace_text,
)


class Command(BaseCommand):
    help = "Audita a trilha de entendimento da IA operacional - fase 20."

    def add_arguments(self, parser):
        parser.add_argument("--format", choices=("text", "json", "markdown"), default="text")
        parser.add_argument("--output", default="", help="Caminho opcional para gravar o relatorio.")

    def handle(self, *args, **options):
        report = build_phase20_understanding_trace_report()
        output_format = options["format"]
        if output_format == "json":
            payload = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True)
        elif output_format == "markdown":
            payload = render_phase20_understanding_trace_markdown(report)
        else:
            payload = render_phase20_understanding_trace_text(report)

        output_path = (options.get("output") or "").strip()
        if output_path:
            with open(output_path, "w", encoding="utf-8") as handle:
                handle.write(payload)
            self.stdout.write(self.style.SUCCESS(f"Relatorio da fase 20 gravado em {output_path}"))
            return

        self.stdout.write(payload)
