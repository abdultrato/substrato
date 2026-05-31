from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.ai_assistant.services.project_map import (
    build_ai_project_map,
    render_ai_project_map_markdown,
    render_ai_project_map_text,
)


class Command(BaseCommand):
    help = "Gera o mapa canonico do projecto para a IA operacional."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--format",
            choices=["text", "json", "markdown"],
            default="text",
            help="Formato de saida do mapa.",
        )
        parser.add_argument(
            "--output",
            default="",
            help="Caminho opcional para gravar o mapa gerado.",
        )

    def handle(self, *args, **options):
        project_map = build_ai_project_map()
        output_format = options["format"]

        if output_format == "json":
            content = json.dumps(project_map, ensure_ascii=False, indent=2)
        elif output_format == "markdown":
            content = render_ai_project_map_markdown(project_map)
        else:
            content = render_ai_project_map_text(project_map)

        output_path = str(options.get("output") or "").strip()
        if output_path:
            path = Path(output_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Mapa canonico da IA gravado em {path}"))
            return

        self.stdout.write(content)
