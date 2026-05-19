from __future__ import annotations

from django.core.management.base import BaseCommand

from events.transactional_outbox import dispatch_pending_outbox_events, runtime_dispatch_enabled


class Command(BaseCommand):
    help = "Despacha eventos pendentes da transactional outbox para o runtime distribuído."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--batch-size", type=int, default=100)
        parser.add_argument("--retry-after-seconds", type=int, default=30)
        parser.add_argument("--max-attempts", type=int, default=10)
        parser.add_argument(
            "--force-runtime",
            action="store_true",
            help="Despacha mesmo com SUBSTRATO_OS_RUNTIME_ENABLED=false.",
        )

    def handle(self, *args, **options):
        force_runtime = bool(options["force_runtime"])
        if not runtime_dispatch_enabled(force=force_runtime):
            self.stdout.write(
                self.style.WARNING(
                    "Runtime distribuído desativado. Use --force-runtime para despacho manual."
                )
            )
            return

        result = dispatch_pending_outbox_events(
            batch_size=options["batch_size"],
            retry_after_seconds=options["retry_after_seconds"],
            max_attempts=options["max_attempts"],
            force_runtime=force_runtime,
        )

        style = self.style.SUCCESS if result.failed == 0 else self.style.WARNING
        self.stdout.write(
            style(
                "Transactional outbox processada "
                f"(processed={result.processed}, delivered={result.delivered}, "
                f"failed={result.failed}, dead_lettered={result.dead_lettered}, "
                f"remaining={result.remaining_pending})."
            )
        )

