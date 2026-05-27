"""Abstrações de fila assíncrona (Celery) com fallback seguro para execução local."""

from __future__ import annotations

import importlib
import logging

from django.conf import settings
from django.db import transaction

from observability.metrics import register_async_task_enqueue

logger = logging.getLogger("task_queue")


def _resolve_task(task_ref):
    if not isinstance(task_ref, str):
        return task_ref

    module_path, _, attr_name = task_ref.rpartition(".")
    if not module_path or not attr_name:
        raise ValueError(f"task_ref inválida: {task_ref}")

    module = importlib.import_module(module_path)
    return getattr(module, attr_name)


def _task_name(task) -> str:
    if hasattr(task, "name") and task.name:
        return str(task.name)
    return getattr(task, "__name__", task.__class__.__name__)


def enqueue_task(
    task_ref,
    *args,
    task_kwargs: dict | None = None,
    queue: str | None = None,
    countdown: int | None = None,
    eta=None,
    priority: int | None = None,
    tenant_id=None,
    fail_silently: bool = True,
):
    """
    Enfileira uma task Celery de forma consistente no projeto.

    Fallback: quando Celery/Broker falha, executa de forma síncrona para evitar
    perda de funcionalidade no request de origem.
    """

    task_kwargs = task_kwargs or {}
    task = _resolve_task(task_ref)
    task_name = _task_name(task).lower()

    if not getattr(settings, "ASYNC_PROCESSING_ENABLED", True):
        register_async_task_enqueue(task_name, "disabled", tenant_id=tenant_id)
        return task(*args, **task_kwargs)

    apply_kwargs = {}
    if queue:
        apply_kwargs["queue"] = queue
    if countdown is not None:
        apply_kwargs["countdown"] = countdown
    if eta is not None:
        apply_kwargs["eta"] = eta
    if priority is not None:
        apply_kwargs["priority"] = priority

    try:
        if hasattr(task, "apply_async"):
            result = task.apply_async(args=args, kwargs=task_kwargs, **apply_kwargs)
        elif hasattr(task, "delay"):
            result = task.delay(*args, **task_kwargs)
        else:
            result = task(*args, **task_kwargs)

        register_async_task_enqueue(task_name, "success", tenant_id=tenant_id)
        return result
    except Exception:
        register_async_task_enqueue(task_name, "failed", tenant_id=tenant_id)

        if not fail_silently:
            raise

        logger.exception(
            "Falha ao enfileirar task, executando fallback síncrono",
            extra={"task_name": task_name},
        )

        try:
            return task(*args, **task_kwargs)
        except Exception:
            logger.exception("Falha no fallback síncrono da task", extra={"task_name": task_name})
            return None


def enqueue_task_on_commit(task_ref, *args, **kwargs):
    """Enfileira task apenas após commit da transação ativa."""

    def _enqueue():
        enqueue_task(task_ref, *args, **kwargs)

    try:
        transaction.on_commit(_enqueue)
    except Exception:
        _enqueue()


def execute_async(function_or_task, *args, **kwargs):
    """Alias compatível com chamadas legadas."""
    task_kwargs = kwargs.pop("task_kwargs", None) or {}
    queue = kwargs.pop("queue", None)
    countdown = kwargs.pop("countdown", None)
    eta = kwargs.pop("eta", None)
    priority = kwargs.pop("priority", None)
    tenant_id = kwargs.pop("tenant_id", None)
    fail_silently = kwargs.pop("fail_silently", True)

    merged_kwargs = {**kwargs, **task_kwargs}
    return enqueue_task(
        function_or_task,
        *args,
        task_kwargs=merged_kwargs,
        queue=queue,
        countdown=countdown,
        eta=eta,
        priority=priority,
        tenant_id=tenant_id,
        fail_silently=fail_silently,
    )


executar_assincrono = execute_async
