"""Endpoint assíncrono para exportação de pacientes como CSV."""

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from services.reports.async_exports import create_export_job
from tasks.export_jobs import run_export_job


class ExportPatientsCSV(APIView):
    """Exporta lista de pacientes como CSV (assíncrono)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Inicia um job de exportação de pacientes como CSV.

        Query Parameters:
        - limit: Número máximo de pacientes (default: 1000, max: 10000)
        - offset: Deslocamento para paginação (default: 0)
        - search: Termo de busca por nome, email ou CPF (optional)

        Returns:
        - 202 Accepted: Job foi enfileirado com sucesso
        - 400 Bad Request: Tenant não encontrado ou parâmetros inválidos
        """
        tenant = getattr(request, "tenant", None)
        user = getattr(request, "user", None)

        if not tenant:
            return Response(
                {"detail": "Tenant não encontrado."},
                status=400
            )

        # Preparar payload
        payload = {
            "tenant_id": tenant.id,
            "limit": int(request.query_params.get("limit", 1000)),
            "offset": int(request.query_params.get("offset", 0)),
            "search": request.query_params.get("search", "").strip(),
        }

        # Criar job assíncrono
        job_state = create_export_job(
            export_key="patients_csv",
            payload=payload,
            tenant_id=tenant.id,
            user_id=user.id if user else None,
            content_disposition="attachment",
        )

        # Enqueue na fila Celery
        run_export_job.delay(job_state["id"])

        # Retornar 202 Accepted com informações do job
        return Response(
            {
                "job_id": job_state["id"],
                "status": "queued",
                "export_key": "patients_csv",
                "created_at": job_state["created_at"],
                "status_url": request.build_absolute_uri(
                    f"/api/v1/monitoring/export_job/{job_state['id']}/"
                ),
                "download_url": request.build_absolute_uri(
                    f"/api/v1/monitoring/export_job/{job_state['id']}/download/"
                ),
            },
            status=202,
        )
