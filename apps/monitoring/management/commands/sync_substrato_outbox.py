from __future__ import annotations

from django.core.management.base import BaseCommand

from events.runtime_bridge import sync_runtime_outbox


class Command(BaseCommand):
    help = "Sincroniza eventos pendentes da outbox do SUBSTRATO OS runtime."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--batch-size", type=int, default=100)
        parser.add_argument("--retry-after-seconds", type=int, default=30)
        parser.add_argument(
            "--force",
            action="store_true",
            help="Sincroniza mesmo com SUBSTRATO_OS_RUNTIME_ENABLED=false.",
        )

    def handle(self, *args, **options):
        result = sync_runtime_outbox(
            batch_size=options["batch_size"],
            retry_after_seconds=options["retry_after_seconds"],
            force=options["force"],
        )

        if result is None:
            self.stdout.write(
                self.style.WARNING(
                    "SUBSTRATO OS runtime desativado. Use --force para sincronização manual."
                )
            )
            return

        self.stdout.write(
            self.style.SUCCESS(
                "Outbox sincronizada "
                f"(delivered={result.delivered}, failed={result.failed}, remaining={result.remaining})."
            )
        )
