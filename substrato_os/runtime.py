from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .cloud import (
    CloudCluster,
    CloudControlPlaneError,
    ClusterFailoverResult,
    ClusterNode,
    ModuleDeployment,
    RolloutAction,
    SQLiteCloudControlPlane,
)
from .distributed import DistributedTask, EdgeNode, ReplicationEntry, SQLiteDistributedRuntime
from .events import EventEnvelope, InMemoryEventStream
from .marketplace import InstalledModule, ModulePackage, SQLiteModuleMarketplace
from .modules import ModuleManifest, ModuleRegistry
from .offline import OutboxReplayResult, SQLiteOutbox
from .queue import QueueHandler, QueueMessage, QueueProcessResult, SQLiteTaskQueue
from .workflow import WorkflowEngine, WorkflowRule


class SubstratoRuntime:
    """
    Runtime composition for module loading, event streaming, offline outbox and workflows.
    """

    def __init__(
        self,
        outbox_path: str | Path = "substrato_outbox.sqlite3",
        queue_path: str | Path | None = None,
    ) -> None:
        self.modules = ModuleRegistry()
        self.event_stream = InMemoryEventStream()
        self.outbox = SQLiteOutbox(database_path=outbox_path)
        self.task_queue = SQLiteTaskQueue(database_path=queue_path or outbox_path)
        self.distributed = SQLiteDistributedRuntime(database_path=queue_path or outbox_path)
        self.marketplace = SQLiteModuleMarketplace(database_path=queue_path or outbox_path)
        self.cloud = SQLiteCloudControlPlane(database_path=queue_path or outbox_path)
        self.workflow_engine = WorkflowEngine(
            event_stream=self.event_stream,
            task_queue=self.task_queue,
        )
        self.event_stream.subscribe("*", self.workflow_engine.handle_event)

    def register_module(self, manifest: ModuleManifest) -> None:
        self.modules.register(manifest)

    def load_module(self, module_key: str) -> None:
        self.modules.load(module_key)

    def publish_module_package(self, package: ModulePackage) -> None:
        self.marketplace.publish(package)

    def list_module_packages(
        self,
        *,
        module_key: str | None = None,
        channel: str | None = None,
    ) -> tuple[ModulePackage, ...]:
        return tuple(self.marketplace.list_packages(module_key=module_key, channel=channel))

    def list_installed_modules(self, *, status: str | None = None) -> tuple[InstalledModule, ...]:
        return tuple(self.marketplace.list_installed(status=status))

    def enable_module_installation(self, module_key: str) -> bool:
        return self.marketplace.enable(module_key)

    def disable_module_installation(self, module_key: str) -> bool:
        return self.marketplace.disable(module_key)

    def install_module_from_marketplace(
        self,
        module_key: str,
        *,
        version: str | None = None,
        channel: str | None = "stable",
        auto_register: bool = True,
        auto_load: bool = False,
        entrypoints: dict[str, Callable[[], None]] | None = None,
    ) -> tuple[InstalledModule, ...]:
        installed = self.marketplace.install(
            module_key=module_key,
            version=version,
            channel=channel,
        )
        if not auto_register:
            return installed

        for installed_module in installed:
            package = self.marketplace.get_package(
                installed_module.module_key,
                installed_module.version,
            )
            if package is None:
                continue
            if self.modules.is_registered(package.module_key):
                continue

            self.register_module(
                ModuleManifest(
                    key=package.module_key,
                    version=package.version,
                    description=package.description,
                    dependencies=package.dependencies,
                    permissions=package.permissions,
                    entrypoint=(entrypoints or {}).get(package.module_key),
                )
            )

        if auto_load:
            self.load_module(module_key)

        return installed

    def register_workflow(self, rule: WorkflowRule) -> None:
        self.workflow_engine.register(rule)

    def publish_event(
        self,
        name: str,
        payload: dict[str, Any],
        *,
        tenant_id: str | None = None,
        source: str = "substrato.runtime",
        offline: bool = False,
    ) -> EventEnvelope:
        event = EventEnvelope(name=name, payload=payload, tenant_id=tenant_id, source=source)
        if offline:
            self.outbox.enqueue(event)
        else:
            self.event_stream.publish(event)
        return event

    def sync_outbox(self, *, batch_size: int = 100, retry_after_seconds: int = 30) -> OutboxReplayResult:
        return self.outbox.replay(
            publisher=self.event_stream.publish,
            batch_size=batch_size,
            retry_after_seconds=retry_after_seconds,
        )

    def enqueue_task(
        self,
        queue_name: str,
        payload: dict[str, Any],
        *,
        tenant_id: str | None = None,
        source: str = "substrato.runtime",
        dedupe_key: str | None = None,
        delay_seconds: int = 0,
        max_attempts: int = 5,
    ) -> QueueMessage:
        return self.task_queue.enqueue(
            queue_name=queue_name,
            payload=payload,
            tenant_id=tenant_id,
            source=source,
            dedupe_key=dedupe_key,
            delay_seconds=delay_seconds,
            max_attempts=max_attempts,
        )

    def process_queue(
        self,
        queue_name: str,
        handler: QueueHandler,
        *,
        batch_size: int = 100,
        retry_after_seconds: int = 30,
    ) -> QueueProcessResult:
        return self.task_queue.process(
            queue_name=queue_name,
            handler=handler,
            limit=batch_size,
            retry_after_seconds=retry_after_seconds,
        )

    @property
    def pending_outbox_events(self) -> int:
        return self.outbox.pending_count()

    def pending_queue_messages(self, queue_name: str | None = None) -> int:
        return self.task_queue.pending_count(queue_name=queue_name)

    def register_edge_node(
        self,
        *,
        node_id: str,
        region: str,
        role: str = "worker",
        metadata: dict[str, Any] | None = None,
        status: str = "online",
    ) -> EdgeNode:
        return self.distributed.register_node(
            node_id=node_id,
            region=region,
            role=role,
            metadata=metadata,
            status=status,
        )

    def heartbeat_edge_node(self, node_id: str, *, status: str = "online") -> bool:
        return self.distributed.heartbeat(node_id=node_id, status=status)

    def list_edge_nodes(
        self,
        *,
        only_online: bool = False,
        stale_after_seconds: int | None = None,
    ) -> list[EdgeNode]:
        return self.distributed.list_nodes(
            only_online=only_online,
            stale_after_seconds=stale_after_seconds,
        )

    def publish_distributed_event(
        self,
        name: str,
        payload: dict[str, Any],
        *,
        source_node_id: str | None = None,
        tenant_id: str | None = None,
        source: str = "substrato.runtime",
        offline: bool = False,
    ) -> EventEnvelope:
        event = self.publish_event(
            name=name,
            payload=payload,
            tenant_id=tenant_id,
            source=source,
            offline=offline,
        )
        self.distributed.append_replication(event, source_node_id=source_node_id)
        return event

    def pull_replication_for_node(self, node_id: str, *, limit: int = 100) -> list[ReplicationEntry]:
        return self.distributed.pull_replication(node_id=node_id, limit=limit)

    def ack_replication_for_node(self, node_id: str, replication_id: str) -> None:
        self.distributed.ack_replication(node_id=node_id, replication_id=replication_id)

    def enqueue_distributed_task(
        self,
        queue_name: str,
        payload: dict[str, Any],
        *,
        tenant_id: str | None = None,
        preferred_region: str | None = None,
        delay_seconds: int = 0,
        max_attempts: int = 5,
    ) -> DistributedTask:
        return self.distributed.enqueue_task(
            queue_name=queue_name,
            payload=payload,
            tenant_id=tenant_id,
            preferred_region=preferred_region,
            delay_seconds=delay_seconds,
            max_attempts=max_attempts,
        )

    def claim_distributed_tasks(
        self,
        *,
        node_id: str,
        queue_name: str,
        limit: int = 50,
        lease_seconds: int = 30,
        node_region: str | None = None,
    ) -> list[DistributedTask]:
        return self.distributed.claim_tasks(
            node_id=node_id,
            queue_name=queue_name,
            limit=limit,
            lease_seconds=lease_seconds,
            node_region=node_region,
        )

    def complete_distributed_task(self, *, task_id: str, node_id: str) -> bool:
        return self.distributed.complete_task(task_id=task_id, node_id=node_id)

    def fail_distributed_task(
        self,
        *,
        task_id: str,
        node_id: str,
        error: str,
        retry_after_seconds: int = 30,
    ) -> str:
        return self.distributed.fail_task(
            task_id=task_id,
            node_id=node_id,
            error=error,
            retry_after_seconds=retry_after_seconds,
        )

    def register_cloud_cluster(
        self,
        *,
        cluster_id: str,
        region: str,
        control_plane_endpoint: str = "",
        status: str = "active",
        metadata: dict[str, Any] | None = None,
    ) -> CloudCluster:
        return self.cloud.register_cluster(
            cluster_id=cluster_id,
            region=region,
            control_plane_endpoint=control_plane_endpoint,
            status=status,
            metadata=metadata,
        )

    def list_cloud_clusters(self, *, status: str | None = None) -> tuple[CloudCluster, ...]:
        return tuple(self.cloud.list_clusters(status=status))

    def set_cloud_cluster_status(self, cluster_id: str, status: str) -> bool:
        return self.cloud.set_cluster_status(cluster_id=cluster_id, status=status)

    def assign_edge_node_to_cluster(
        self,
        *,
        cluster_id: str,
        node_id: str,
        node_role: str = "worker",
    ) -> ClusterNode:
        return self.cloud.assign_node(
            cluster_id=cluster_id,
            node_id=node_id,
            node_role=node_role,
        )

    def list_cluster_nodes(self, cluster_id: str) -> tuple[ClusterNode, ...]:
        return tuple(self.cloud.list_cluster_nodes(cluster_id))

    def deploy_module_to_cluster(
        self,
        *,
        cluster_id: str,
        module_key: str,
        module_version: str,
        desired_replicas: int,
        strategy: str = "rolling",
    ) -> ModuleDeployment:
        return self.cloud.deploy_module(
            cluster_id=cluster_id,
            module_key=module_key,
            module_version=module_version,
            desired_replicas=desired_replicas,
            strategy=strategy,
        )

    def report_cluster_deployment_progress(
        self,
        *,
        deployment_id: str,
        ready_replicas: int,
        status: str | None = None,
        last_error: str | None = None,
    ) -> ModuleDeployment:
        return self.cloud.report_deployment_progress(
            deployment_id=deployment_id,
            ready_replicas=ready_replicas,
            status=status,
            last_error=last_error,
        )

    def list_cluster_deployments(
        self,
        *,
        cluster_id: str | None = None,
        status: str | None = None,
    ) -> tuple[ModuleDeployment, ...]:
        return tuple(self.cloud.list_deployments(cluster_id=cluster_id, status=status))

    def reconcile_cluster_deployment(
        self,
        deployment_id: str,
        *,
        queue_name: str = "cloud.rollout",
        lease_seconds: int = 60,
    ) -> tuple[DistributedTask, ...]:
        actions = self.cloud.plan_rollout_actions(deployment_id)
        if not actions:
            return ()

        queued_tasks: list[DistributedTask] = []
        for action in actions:
            selected_node = self._select_node_for_cluster(action.cluster_id)
            if selected_node is None:
                raise CloudControlPlaneError(
                    f"No online edge node available for cluster={action.cluster_id}"
                )
            cluster = self.cloud.get_cluster(action.cluster_id)
            if cluster is None:
                raise CloudControlPlaneError(f"Cluster not found: {action.cluster_id}")

            task_payload = {
                "deployment_id": action.deployment_id,
                "action": action.action,
                "module_key": action.module_key,
                "module_version": action.module_version,
                "replica_ordinal": action.replica_ordinal,
                "target_cluster_id": action.cluster_id,
                "target_node_id": selected_node.node_id,
                "lease_seconds": lease_seconds,
            }

            queued_tasks.append(
                self.enqueue_distributed_task(
                    queue_name,
                    task_payload,
                    preferred_region=cluster.region,
                )
            )
            self._observe_cloud_rollout_action(action)

        return tuple(queued_tasks)

    def orchestrate_edge_task(
        self,
        queue_name: str,
        payload: dict[str, Any],
        *,
        preferred_cluster_id: str | None = None,
        preferred_region: str | None = None,
        tenant_id: str | None = None,
        delay_seconds: int = 0,
        max_attempts: int = 5,
    ) -> DistributedTask:
        selected_cluster_id: str | None = None
        selected_node_id: str | None = None
        resolved_region = preferred_region

        if preferred_cluster_id:
            node = self._select_node_for_cluster(preferred_cluster_id)
            if node:
                selected_node_id = node.node_id
                selected_cluster_id = preferred_cluster_id
                cluster = self.cloud.get_cluster(preferred_cluster_id)
                if cluster:
                    resolved_region = cluster.region
        elif preferred_region:
            node = self._select_node_for_region(preferred_region)
            if node:
                selected_node_id = node.node_id
                resolved_region = preferred_region

        orchestration_payload = dict(payload)
        orchestration_payload["_orchestration"] = {
            "cluster_id": selected_cluster_id,
            "target_node_id": selected_node_id,
            "scheduled_at": datetime.now(tz=UTC).isoformat(),
        }

        return self.enqueue_distributed_task(
            queue_name,
            orchestration_payload,
            tenant_id=tenant_id,
            preferred_region=resolved_region,
            delay_seconds=delay_seconds,
            max_attempts=max_attempts,
        )

    def auto_failover_cluster(
        self,
        source_cluster_id: str,
        *,
        target_cluster_id: str | None = None,
        queue_name: str = "cloud.rollout",
        lease_seconds: int = 60,
    ) -> ClusterFailoverResult:
        source_cluster = self.cloud.get_cluster(source_cluster_id)
        if source_cluster is None:
            raise CloudControlPlaneError(f"Source cluster not found: {source_cluster_id}")

        target_cluster = (
            self.cloud.get_cluster(target_cluster_id)
            if target_cluster_id is not None
            else self._select_failover_target_cluster(source_cluster_id)
        )
        if target_cluster is None:
            raise CloudControlPlaneError("No eligible target cluster available for failover")
        if target_cluster.cluster_id == source_cluster_id:
            raise CloudControlPlaneError("Source and target clusters must be different")

        source_deployments = self.cloud.list_deployments(cluster_id=source_cluster_id)
        if not source_deployments:
            self.cloud.set_cluster_status(source_cluster_id, "failed_over")
            self._observe_cloud_failover(
                source_cluster_id=source_cluster_id,
                target_cluster_id=target_cluster.cluster_id,
                status="completed",
                migrated_deployments=0,
                tasks_enqueued=0,
            )
            return ClusterFailoverResult(
                source_cluster_id=source_cluster_id,
                target_cluster_id=target_cluster.cluster_id,
                migrated_deployments=0,
                tasks_enqueued=0,
                source_status="failed_over",
                target_status=target_cluster.status,
            )

        migrated = 0
        total_tasks = 0
        for deployment in source_deployments:
            target_deployment = self.deploy_module_to_cluster(
                cluster_id=target_cluster.cluster_id,
                module_key=deployment.module_key,
                module_version=deployment.module_version,
                desired_replicas=deployment.desired_replicas,
                strategy=deployment.strategy,
            )
            migrated += 1
            queued = self.reconcile_cluster_deployment(
                target_deployment.deployment_id,
                queue_name=queue_name,
                lease_seconds=lease_seconds,
            )
            total_tasks += len(queued)

        self.cloud.set_cluster_status(source_cluster_id, "failed_over")
        self.cloud.set_cluster_status(target_cluster.cluster_id, "active")
        self._observe_cloud_failover(
            source_cluster_id=source_cluster_id,
            target_cluster_id=target_cluster.cluster_id,
            status="completed",
            migrated_deployments=migrated,
            tasks_enqueued=total_tasks,
        )
        return ClusterFailoverResult(
            source_cluster_id=source_cluster_id,
            target_cluster_id=target_cluster.cluster_id,
            migrated_deployments=migrated,
            tasks_enqueued=total_tasks,
            source_status="failed_over",
            target_status="active",
        )

    def _select_node_for_cluster(self, cluster_id: str) -> EdgeNode | None:
        cluster_nodes = self.cloud.list_cluster_nodes(cluster_id)
        if not cluster_nodes:
            return None
        online_nodes = {
            node.node_id: node
            for node in self.distributed.list_nodes(only_online=True)
        }
        for cluster_node in cluster_nodes:
            resolved = online_nodes.get(cluster_node.node_id)
            if resolved is not None:
                return resolved
        return None

    def _select_node_for_region(self, region: str) -> EdgeNode | None:
        for node in self.distributed.list_nodes(only_online=True):
            if node.region == region:
                return node
        return None

    def _select_failover_target_cluster(self, source_cluster_id: str) -> CloudCluster | None:
        source_cluster = self.cloud.get_cluster(source_cluster_id)
        if source_cluster is None:
            return None
        active_clusters = [
            cluster
            for cluster in self.cloud.list_clusters(status="active")
            if cluster.cluster_id != source_cluster_id
        ]
        if not active_clusters:
            return None

        same_region: list[CloudCluster] = []
        cross_region: list[CloudCluster] = []
        for cluster in active_clusters:
            has_online_node = self._select_node_for_cluster(cluster.cluster_id) is not None
            if not has_online_node:
                continue
            if cluster.region == source_cluster.region:
                same_region.append(cluster)
            else:
                cross_region.append(cluster)

        if same_region:
            return same_region[0]
        if cross_region:
            return cross_region[0]
        return None

    def _observe_cloud_rollout_action(self, action: RolloutAction) -> None:
        try:
            from observability.metrics import register_cloud_rollout_task

            register_cloud_rollout_task(
                cluster_id=action.cluster_id,
                module_key=action.module_key,
                action=action.action,
            )
        except Exception:
            pass
        try:
            from observability.audit import register_cloud_event

            register_cloud_event(
                action="rollout_task_enqueued",
                status="queued",
                source_cluster_id=action.cluster_id,
                deployment_id=action.deployment_id,
                details={
                    "module_key": action.module_key,
                    "module_version": action.module_version,
                    "rollout_action": action.action,
                    "replica_ordinal": action.replica_ordinal,
                },
            )
        except Exception:
            pass

    def _observe_cloud_failover(
        self,
        *,
        source_cluster_id: str,
        target_cluster_id: str,
        status: str,
        migrated_deployments: int,
        tasks_enqueued: int,
    ) -> None:
        try:
            from observability.metrics import register_cloud_failover

            register_cloud_failover(
                source_cluster_id=source_cluster_id,
                target_cluster_id=target_cluster_id,
                status=status,
            )
        except Exception:
            pass
        try:
            from observability.audit import register_cloud_event

            register_cloud_event(
                action="cluster_failover",
                status=status,
                source_cluster_id=source_cluster_id,
                target_cluster_id=target_cluster_id,
                details={
                    "migrated_deployments": migrated_deployments,
                    "tasks_enqueued": tasks_enqueued,
                },
            )
        except Exception:
            pass
