"""Helpers para enfileirar e consultar exportações assíncronas."""

from __future__ import annotations

import logging

from django.urls import reverse
from rest_framework import status
from rest_framework.response import Response

from infrastructure.task_queue import enqueue_task
from services.reports.async_exports import create_export_job, mark_export_job_failed

logger = logging.getLogger(__name__)


def _truthy(value) -> bool:
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "t", "yes", "sim"}


def is_async_requested(request) -> bool:
    return _truthy(request.query_params.get("async") or request.query_params.get("assinc"))


def _job_urls(job_id: str) -> tuple[str, str]:
    try:
        status_path = reverse("monitoring-export_job-detail", kwargs={"pk": job_id})
        download_path = reverse("monitoring-export_job-download", kwargs={"pk": job_id})
    except Exception:
        status_path = f"/api/v1/monitoring/export_job/{job_id}/"
        download_path = f"/api/v1/monitoring/export_job/{job_id}/download/"

    return f"{str(status_path).rstrip('/')}/", f"{str(download_path).rstrip('/')}/"


def _serialize_job_for_response(request, state: dict) -> dict:
    job_id = state["id"]
    status_url, download_url = _job_urls(job_id)
    return {
        "id": job_id,
        "status": state.get("status"),
        "export_key": state.get("export_key"),
        "created_at": state.get("created_at"),
        "updated_at": state.get("updated_at"),
        "started_at": state.get("started_at"),
        "finished_at": state.get("finished_at"),
        "error": state.get("error"),
        "status_url": status_url,
        "download_url": download_url,
    }


def enqueue_export_job_response(
    request,
    *,
    export_key: str,
    payload: dict,
    content_disposition: str = "inline",
) -> Response:
    tenant = getattr(request, "tenant", None)
    user = getattr(request, "user", None)

    state = create_export_job(
        export_key=export_key,
        payload=payload,
        tenant_id=getattr(tenant, "id", None),
        user_id=getattr(user, "id", None),
        content_disposition=content_disposition,
    )

    job_id = state["id"]

    try:
        enqueue_task(
            "tasks.export_jobs.run_export_job",
            task_kwargs={"job_id": job_id},
            queue="exports",
            tenant_id=getattr(tenant, "id", None),
            fail_silently=False,
        )
    except Exception:
        logger.exception("Falha ao enfileirar export job", extra={"job_id": job_id, "export_key": export_key})
        mark_export_job_failed(job_id, "Falha ao enfileirar task de exportação.")
        payload = _serialize_job_for_response(request, state | {"status": "failed", "error": "Falha ao enfileirar."})
        return Response(payload, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response(_serialize_job_for_response(request, state), status=status.HTTP_202_ACCEPTED)


def queue_export_if_requested(
    request,
    *,
    export_key: str,
    payload: dict,
    content_disposition: str = "inline",
) -> Response | None:
    if not is_async_requested(request):
        return None

    return enqueue_export_job_response(
        request,
        export_key=export_key,
        payload=payload,
        content_disposition=content_disposition,
    )
