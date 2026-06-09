from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.monitoring.models.outbox_event import TransactionalOutboxEvent


class Command(BaseCommand):
    """Recoloca eventos de outbox em dead-letter de volta na fila (§34 reprocessamento).

    O dispatcher do outbox só reprocessa eventos PENDING/FAILED; eventos que
    esgotaram as tentativas ficam em DEAD_LETTER e nunca são re-tentados
    automaticamente. Este comando dá ao operador o caminho de reprocessamento
    manual depois de corrigida a causa raiz da falha.
    """

    help = "Recoloca eventos de outbox em dead-letter de volta na fila para reprocessamento."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--event-type",
            default="",
            help="Recoloca apenas eventos deste tipo (por omissão: todos).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Número máximo de eventos a recolocar (0 = sem limite).",
        )

    def handle(self, *args, **options) -> None:
        queryset = TransactionalOutboxEvent.objects.filter(
            status=TransactionalOutboxEvent.Status.DEAD_LETTER
        ).order_by("available_at", "id")

        event_type = (options.get("event_type") or "").strip()
        if event_type:
            queryset = queryset.filter(event_type=event_type)

        limit = int(options.get("limit") or 0)
        if limit > 0:
            queryset = queryset[:limit]

        count = 0
        for event in list(queryset):
            event.requeue()
            count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Recolocados {count} evento(s) de dead-letter na fila.")
        )
