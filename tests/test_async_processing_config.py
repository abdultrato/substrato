from io import StringIO

from django.conf import settings
from django.core.management import call_command
from django.test import override_settings

from infrastructure.task_queue import enqueue_task


def test_celery_named_queues_and_routes_are_configured():
    queue_names = {queue.name for queue in settings.CELERY_TASK_QUEUES}

    assert {"default", "exports", "billing", "operations"}.issubset(queue_names)
    assert settings.CELERY_TASK_ROUTES["tasks.export_jobs.run_export_job"]["queue"] == "exports"
    assert (
        settings.CELERY_TASK_ROUTES["tasks.billing.recalculation.recalculate_invoice_task"]["queue"]
        == "billing"
    )
    assert (
        settings.CELERY_TASK_ROUTES["tasks.authorization_worker.process_authorization_task"]["queue"]
        == "operations"
    )


def test_async_processing_check_command_reports_configuration():
    output = StringIO()

    call_command("check_async_processing", stdout=output)

    rendered = output.getvalue()
    assert "Processamento" in rendered
    assert "Broker Celery" in rendered
    assert "Filas" in rendered


def test_enqueue_task_runs_locally_when_async_processing_is_disabled():
    class LocalTask:
        name = "tests.local_task"

        def __init__(self):
            self.apply_async_called = False

        def apply_async(self, *args, **kwargs):
            self.apply_async_called = True
            raise AssertionError("apply_async should not be called when async is disabled")

        def __call__(self, value):
            return value + 1

    task = LocalTask()

    with override_settings(ASYNC_PROCESSING_ENABLED=False):
        assert enqueue_task(task, 2) == 3

    assert task.apply_async_called is False
