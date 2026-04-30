from django.http import HttpResponse
from django.urls import reverse
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated  # Protege o endpoint
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet, ViewSet  # Apenas leitura

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.monitoring.models.system_error import SystemError
from services.reports.async_exports import (
    can_access_export_job,
    get_export_job_result,
    get_export_job_state,
)

from ..filters import SystemErrorFilter
from ..serializers import SystemErrorSerializer


class SystemErrorViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ReadOnlyModelViewSet):
    queryset = SystemError.objects.select_related("user").all()
    serializer_class = SystemErrorSerializer
    filterset_class = SystemErrorFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["path", "exception_class", "message", "user__username"]
    ordering_fields = ["created_at", "status_code", "exception_class"]
    ordering = ["-created_at", "-id"]


class ExportJobViewSet(ValidatedSearchOrderingMixin, ViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    def _get_job_or_404(self, request, pk: str) -> dict:
        state = get_export_job_state(pk)
        if not state:
            raise NotFound("Job de exportação não encontrado.")

        user = getattr(request, "user", None)
        tenant = getattr(request, "tenant", None)
        can_access = can_access_export_job(
            state,
            tenant_id=getattr(tenant, "id", None),
            user_id=getattr(user, "id", None),
            is_superuser=bool(getattr(user, "is_superuser", False)),
        )
        if not can_access:
            raise NotFound("Job de exportação não encontrado.")

        return state

    def _serialize_job(self, request, state: dict) -> dict:
        job_id = state.get("id")
        try:
            status_path = reverse("monitoring-export_job-detail", kwargs={"pk": job_id})
            download_path = reverse("monitoring-export_job-download", kwargs={"pk": job_id})
        except Exception:
            status_path = f"/api/v1/monitoring/export_job/{job_id}/"
            download_path = f"/api/v1/monitoring/export_job/{job_id}/download/"

        return {
            "id": job_id,
            "status": state.get("status"),
            "export_key": state.get("export_key"),
            "created_at": state.get("created_at"),
            "updated_at": state.get("updated_at"),
            "started_at": state.get("started_at"),
            "finished_at": state.get("finished_at"),
            "filename": state.get("filename"),
            "content_type": state.get("content_type"),
            "error": state.get("error"),
            "status_url": request.build_absolute_uri(status_path),
            "download_url": request.build_absolute_uri(download_path),
        }

    def retrieve(self, request, pk=None):
        state = self._get_job_or_404(request, pk)
        return Response(self._serialize_job(request, state))

    @action(detail=True, methods=["get"], url_path="download", url_name="download")
    def download(self, request, pk=None):
        state = self._get_job_or_404(request, pk)
        if state.get("status") != "ready":
            return Response(
                {
                    "detail": "Exportação ainda não está pronta.",
                    "status": state.get("status"),
                    "error": state.get("error"),
                },
                status=409,
            )

        result = get_export_job_result(pk)
        if not result:
            raise NotFound("Arquivo de exportação não disponível.")

        file_bytes, filename, content_type = result
        response = HttpResponse(file_bytes, content_type=content_type)
        disposition = (state.get("content_disposition") or "inline").strip().lower()
        if disposition not in {"inline", "attachment"}:
            disposition = "inline"
        response["Content-Disposition"] = f'{disposition}; filename="{filename}"'
        return response


VIEWSET_MAP = {
    "error": SystemErrorViewSet,
    "export_job": ExportJobViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "ExportJobViewSet",
    "SystemErrorViewSet",
]

