from __future__ import annotations

from contextlib import suppress

from django.conf import settings
from django.core.cache import cache
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Verifica configuração de processamento assíncrono (Celery, filas, Redis/cache)."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Falha quando broker/cache não estiverem acessíveis.",
        )

    def handle(self, *args, **options):
        strict = bool(options["strict"])
        failures: list[str] = []

        self._line("Processamento assíncrono", "activo" if settings.ASYNC_PROCESSING_ENABLED else "inactivo")
        self._line("Broker Celery", settings.CELERY_BROKER_URL)
        self._line("Result backend", settings.CELERY_RESULT_BACKEND)
        self._line("Filas", ", ".join(settings.CELERY_WORKER_QUEUES))
        self._line("Eager local", str(settings.CELERY_TASK_ALWAYS_EAGER))

        self._check_queues(failures)
        self._check_cache(failures)
        self._check_broker(failures, strict=strict)
        self._check_task_registry(failures)

        if failures:
            message = " | ".join(failures)
            if strict:
                raise CommandError(message)
            self.stdout.write(self.style.WARNING(message))
            return

        self.stdout.write(self.style.SUCCESS("Processamento assíncrono configurado."))

    def _line(self, label: str, value: str) -> None:
        self.stdout.write(f"{label}: {value}")

    def _check_queues(self, failures: list[str]) -> None:
        required = {"default", "exports", "billing", "operations"}
        configured = {getattr(queue, "name", "") for queue in settings.CELERY_TASK_QUEUES}
        missing = sorted(required - configured)
        if missing:
            failures.append(f"Filas Celery ausentes: {', '.join(missing)}")

    def _check_cache(self, failures: list[str]) -> None:
        key = "async_processing:healthcheck"
        try:
            cache.set(key, "ok", timeout=15)
            value = cache.get(key)
        except Exception as exc:
            failures.append(f"Cache indisponível: {exc}")
            return

        if value != "ok":
            failures.append("Cache não confirmou escrita/leitura de healthcheck")

    def _check_broker(self, failures: list[str], *, strict: bool) -> None:
        broker_url = str(settings.CELERY_BROKER_URL or "")
        if broker_url.startswith("memory://"):
            if strict:
                failures.append("Broker memory:// não é válido para workers separados")
            else:
                self.stdout.write(
                    self.style.WARNING("Broker memory:// detectado; use REDIS_URL para processamento real.")
                )
            return

        if not broker_url.startswith("redis://") and not broker_url.startswith("rediss://"):
            self.stdout.write(self.style.WARNING("Broker não Redis; ping automático ignorado."))
            return

        try:
            import redis

            client = redis.from_url(
                broker_url,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            client.ping()
        except Exception as exc:
            failures.append(f"Broker Redis indisponível: {exc}")

    def _check_task_registry(self, failures: list[str]) -> None:
        with suppress(Exception):
            from platform.celery import app

            app.loader.import_default_modules()
            registered = set(app.tasks.keys())
            expected = {
                "tasks.export_jobs.run_export_job",
                "tasks.billing.recalculation.recalculate_invoice_task",
            }
            missing = sorted(expected - registered)
            if missing:
                failures.append(f"Tasks Celery não registradas: {', '.join(missing)}")
            return

        failures.append("Não foi possível carregar a aplicação Celery")
