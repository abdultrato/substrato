from __future__ import annotations

from unittest.mock import patch

import pytest

from substrato_os.cloud import CloudControlPlaneError
from substrato_os.runtime import SubstratoRuntime


def test_cluster_rollout_reconcile_enqueues_edge_tasks(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "cloud.sqlite3")

    runtime.register_edge_node(node_id="edge-maputo-1", region="maputo")
    runtime.register_cloud_cluster(
        cluster_id="cluster-mz-1",
        region="maputo",
        control_plane_endpoint="https://cp.maputo.local",
    )
    runtime.assign_edge_node_to_cluster(
        cluster_id="cluster-mz-1",
        node_id="edge-maputo-1",
    )

    deployment = runtime.deploy_module_to_cluster(
        cluster_id="cluster-mz-1",
        module_key="substrato.modules.financeiro",
        module_version="1.1.0",
        desired_replicas=2,
    )
    queued = runtime.reconcile_cluster_deployment(deployment.deployment_id)

    assert len(queued) == 2
    assert runtime.distributed.pending_task_count("cloud.rollout") == 2
    assert queued[0].payload["action"] == "start_replica"
    assert queued[0].payload["target_cluster_id"] == "cluster-mz-1"
    assert queued[0].payload["target_node_id"] == "edge-maputo-1"


def test_cluster_deployment_progress_marks_completed(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "cloud.sqlite3")

    runtime.register_cloud_cluster(cluster_id="cluster-mz-2", region="beira")
    deployment = runtime.deploy_module_to_cluster(
        cluster_id="cluster-mz-2",
        module_key="substrato.modules.core",
        module_version="1.0.0",
        desired_replicas=3,
    )

    updated = runtime.report_cluster_deployment_progress(
        deployment_id=deployment.deployment_id,
        ready_replicas=3,
    )

    assert updated.status == "completed"
    assert updated.ready_replicas == 3


def test_orchestrate_edge_task_uses_cluster_preference(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "cloud.sqlite3")

    runtime.register_edge_node(node_id="edge-maputo-1", region="maputo")
    runtime.register_edge_node(node_id="edge-beira-1", region="beira")
    runtime.register_cloud_cluster(cluster_id="cluster-mz-1", region="maputo")
    runtime.assign_edge_node_to_cluster(
        cluster_id="cluster-mz-1",
        node_id="edge-maputo-1",
    )

    task = runtime.orchestrate_edge_task(
        "ai.inference.jobs",
        {"job_id": "J-100"},
        preferred_cluster_id="cluster-mz-1",
    )

    assert task.preferred_region == "maputo"
    assert task.payload["_orchestration"]["cluster_id"] == "cluster-mz-1"
    assert task.payload["_orchestration"]["target_node_id"] == "edge-maputo-1"


def test_reconcile_cluster_rollout_requires_online_nodes(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "cloud.sqlite3")

    runtime.register_edge_node(node_id="edge-maputo-1", region="maputo")
    runtime.heartbeat_edge_node("edge-maputo-1", status="offline")
    runtime.register_cloud_cluster(cluster_id="cluster-mz-1", region="maputo")
    runtime.assign_edge_node_to_cluster(
        cluster_id="cluster-mz-1",
        node_id="edge-maputo-1",
    )
    deployment = runtime.deploy_module_to_cluster(
        cluster_id="cluster-mz-1",
        module_key="substrato.modules.financeiro",
        module_version="1.1.0",
        desired_replicas=1,
    )

    with pytest.raises(CloudControlPlaneError):
        runtime.reconcile_cluster_deployment(deployment.deployment_id)


def test_auto_failover_migrates_deployments_and_enqueues_rollout(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "cloud.sqlite3")

    runtime.register_edge_node(node_id="edge-a", region="maputo")
    runtime.register_edge_node(node_id="edge-b", region="beira")
    runtime.register_cloud_cluster(cluster_id="cluster-a", region="maputo")
    runtime.register_cloud_cluster(cluster_id="cluster-b", region="beira")
    runtime.assign_edge_node_to_cluster(cluster_id="cluster-a", node_id="edge-a")
    runtime.assign_edge_node_to_cluster(cluster_id="cluster-b", node_id="edge-b")

    runtime.deploy_module_to_cluster(
        cluster_id="cluster-a",
        module_key="substrato.modules.financeiro",
        module_version="1.2.0",
        desired_replicas=2,
    )

    result = runtime.auto_failover_cluster("cluster-a", target_cluster_id="cluster-b")

    assert result.source_cluster_id == "cluster-a"
    assert result.target_cluster_id == "cluster-b"
    assert result.migrated_deployments == 1
    assert result.tasks_enqueued == 2
    assert runtime.cloud.get_cluster("cluster-a").status == "failed_over"
    assert runtime.distributed.pending_task_count("cloud.rollout") == 2


def test_rollout_and_failover_emit_observability_hooks(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "cloud.sqlite3")
    runtime.register_edge_node(node_id="edge-a", region="maputo")
    runtime.register_edge_node(node_id="edge-b", region="beira")
    runtime.register_cloud_cluster(cluster_id="cluster-a", region="maputo")
    runtime.register_cloud_cluster(cluster_id="cluster-b", region="beira")
    runtime.assign_edge_node_to_cluster(cluster_id="cluster-a", node_id="edge-a")
    runtime.assign_edge_node_to_cluster(cluster_id="cluster-b", node_id="edge-b")

    deployment = runtime.deploy_module_to_cluster(
        cluster_id="cluster-a",
        module_key="substrato.modules.core",
        module_version="1.0.0",
        desired_replicas=1,
    )

    with (
        patch("observability.metrics.register_cloud_rollout_task") as rollout_metric,
        patch("observability.metrics.register_cloud_failover") as failover_metric,
        patch("observability.audit.register_cloud_event") as audit_event,
    ):
        runtime.reconcile_cluster_deployment(deployment.deployment_id)
        runtime.auto_failover_cluster("cluster-a", target_cluster_id="cluster-b")

    assert rollout_metric.call_count >= 2
    assert failover_metric.call_count == 1
    assert audit_event.call_count >= 3
