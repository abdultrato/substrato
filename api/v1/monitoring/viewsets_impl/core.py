from django.http import HttpResponse
from django.urls import reverse
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAdminUser, IsAuthenticated  # Protege o endpoint
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet, ViewSet  # Apenas leitura

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.monitoring.models.system_error import SystemError
from events.runtime_bridge import get_runtime, runtime_enabled
from substrato_os.cloud import CloudControlPlaneError
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


class CloudControlViewSet(ValidatedSearchOrderingMixin, ViewSet):
    permission_classes = [IsAdminUser]
    http_method_names = ["get", "post", "head", "options"]

    def list(self, request):
        runtime = self._runtime_or_none()
        if runtime is None:
            return Response({"detail": "SUBSTRATO OS runtime desativado."}, status=503)

        resource = (request.query_params.get("resource") or "overview").strip().lower()
        try:
            if resource == "clusters":
                status_filter = request.query_params.get("status")
                clusters = runtime.list_cloud_clusters(status=status_filter)
                return Response({"clusters": [self._serialize_cluster(cluster) for cluster in clusters]})

            if resource == "deployments":
                cluster_id = request.query_params.get("cluster_id")
                status_filter = request.query_params.get("status")
                deployments = runtime.list_cluster_deployments(
                    cluster_id=cluster_id,
                    status=status_filter,
                )
                return Response(
                    {
                        "deployments": [
                            self._serialize_deployment(deployment)
                            for deployment in deployments
                        ]
                    }
                )

            if resource == "nodes":
                cluster_id = request.query_params.get("cluster_id")
                if not cluster_id:
                    return Response({"detail": "cluster_id é obrigatório para resource=nodes."}, status=400)
                nodes = runtime.list_cluster_nodes(cluster_id)
                return Response({"nodes": [self._serialize_cluster_node(node) for node in nodes]})

            if resource == "overview":
                clusters = runtime.list_cloud_clusters()
                deployments = runtime.list_cluster_deployments()
                return Response(
                    {
                        "clusters_total": len(clusters),
                        "clusters_active": len([item for item in clusters if item.status == "active"]),
                        "deployments_total": len(deployments),
                        "deployments_completed": len([item for item in deployments if item.status == "completed"]),
                        "deployments_rolling_out": len([item for item in deployments if item.status == "rolling_out"]),
                    }
                )
        except CloudControlPlaneError as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response({"detail": f"resource inválido: {resource}"}, status=400)

    def create(self, request):
        runtime = self._runtime_or_none()
        if runtime is None:
            return Response({"detail": "SUBSTRATO OS runtime desativado."}, status=503)

        action_name = (request.data.get("action") or "").strip().lower()
        try:
            if action_name == "register_cluster":
                cluster = runtime.register_cloud_cluster(
                    cluster_id=self._required(request, "cluster_id"),
                    region=self._required(request, "region"),
                    control_plane_endpoint=request.data.get("control_plane_endpoint") or "",
                    status=request.data.get("status") or "active",
                    metadata=request.data.get("metadata") or {},
                )
                return Response({"cluster": self._serialize_cluster(cluster)}, status=201)

            if action_name == "assign_node":
                cluster_id = self._required(request, "cluster_id")
                node_id = self._required(request, "node_id")
                node_role = request.data.get("node_role") or "worker"
                node_region = request.data.get("node_region")

                if node_region:
                    runtime.register_edge_node(
                        node_id=node_id,
                        region=str(node_region),
                        role=node_role,
                    )
                assignment = runtime.assign_edge_node_to_cluster(
                    cluster_id=cluster_id,
                    node_id=node_id,
                    node_role=node_role,
                )
                return Response({"assignment": self._serialize_cluster_node(assignment)}, status=201)

            if action_name == "deploy_module":
                deployment = runtime.deploy_module_to_cluster(
                    cluster_id=self._required(request, "cluster_id"),
                    module_key=self._required(request, "module_key"),
                    module_version=self._required(request, "module_version"),
                    desired_replicas=self._required_int(request, "desired_replicas", min_value=1),
                    strategy=request.data.get("strategy") or "rolling",
                )
                return Response({"deployment": self._serialize_deployment(deployment)}, status=201)

            if action_name == "reconcile_deployment":
                queue_name = request.data.get("queue_name") or "cloud.rollout"
                lease_seconds = self._optional_int(request, "lease_seconds", default=60, min_value=1)
                tasks = runtime.reconcile_cluster_deployment(
                    self._required(request, "deployment_id"),
                    queue_name=queue_name,
                    lease_seconds=lease_seconds,
                )
                return Response({"tasks_enqueued": len(tasks)})

            if action_name == "report_progress":
                deployment = runtime.report_cluster_deployment_progress(
                    deployment_id=self._required(request, "deployment_id"),
                    ready_replicas=self._required_int(request, "ready_replicas", min_value=0),
                    status=request.data.get("status"),
                    last_error=request.data.get("last_error"),
                )
                return Response({"deployment": self._serialize_deployment(deployment)})

            if action_name == "failover_cluster":
                queue_name = request.data.get("queue_name") or "cloud.rollout"
                lease_seconds = self._optional_int(request, "lease_seconds", default=60, min_value=1)
                result = runtime.auto_failover_cluster(
                    self._required(request, "source_cluster_id"),
                    target_cluster_id=request.data.get("target_cluster_id"),
                    queue_name=queue_name,
                    lease_seconds=lease_seconds,
                )
                return Response(
                    {
                        "result": {
                            "source_cluster_id": result.source_cluster_id,
                            "target_cluster_id": result.target_cluster_id,
                            "migrated_deployments": result.migrated_deployments,
                            "tasks_enqueued": result.tasks_enqueued,
                            "source_status": result.source_status,
                            "target_status": result.target_status,
                        }
                    }
                )

            if action_name == "set_cluster_status":
                updated = runtime.set_cloud_cluster_status(
                    cluster_id=self._required(request, "cluster_id"),
                    status=self._required(request, "status"),
                )
                return Response({"updated": bool(updated)})
        except CloudControlPlaneError as exc:
            return Response({"detail": str(exc)}, status=400)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response({"detail": "action inválida."}, status=400)

    def _runtime_or_none(self):
        if not runtime_enabled(force=False):
            return None
        return get_runtime()

    def _required(self, request, key: str) -> str:
        value = request.data.get(key)
        if value in (None, ""):
            raise ValueError(f"{key} é obrigatório.")
        return str(value)

    def _required_int(self, request, key: str, *, min_value: int | None = None) -> int:
        value = request.data.get(key)
        if value in (None, ""):
            raise ValueError(f"{key} é obrigatório.")
        try:
            parsed = int(value)
        except Exception as exc:
            raise ValueError(f"{key} deve ser inteiro.") from exc
        if min_value is not None and parsed < min_value:
            raise ValueError(f"{key} deve ser >= {min_value}.")
        return parsed

    def _optional_int(
        self,
        request,
        key: str,
        *,
        default: int,
        min_value: int | None = None,
    ) -> int:
        value = request.data.get(key)
        if value in (None, ""):
            return default
        try:
            parsed = int(value)
        except Exception as exc:
            raise ValueError(f"{key} deve ser inteiro.") from exc
        if min_value is not None and parsed < min_value:
            raise ValueError(f"{key} deve ser >= {min_value}.")
        return parsed

    def _serialize_cluster(self, cluster) -> dict:
        return {
            "cluster_id": cluster.cluster_id,
            "region": cluster.region,
            "control_plane_endpoint": cluster.control_plane_endpoint,
            "status": cluster.status,
            "metadata": cluster.metadata,
            "created_at": cluster.created_at.isoformat(),
            "updated_at": cluster.updated_at.isoformat(),
        }

    def _serialize_cluster_node(self, node) -> dict:
        return {
            "cluster_id": node.cluster_id,
            "node_id": node.node_id,
            "node_role": node.node_role,
            "assigned_at": node.assigned_at.isoformat(),
        }

    def _serialize_deployment(self, deployment) -> dict:
        return {
            "deployment_id": deployment.deployment_id,
            "cluster_id": deployment.cluster_id,
            "module_key": deployment.module_key,
            "module_version": deployment.module_version,
            "desired_replicas": deployment.desired_replicas,
            "ready_replicas": deployment.ready_replicas,
            "strategy": deployment.strategy,
            "status": deployment.status,
            "last_error": deployment.last_error,
            "created_at": deployment.created_at.isoformat(),
            "updated_at": deployment.updated_at.isoformat(),
        }


VIEWSET_MAP = {
    "error": SystemErrorViewSet,
    "export_job": ExportJobViewSet,
    "cloud_control": CloudControlViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "CloudControlViewSet",
    "ExportJobViewSet",
    "SystemErrorViewSet",
]
