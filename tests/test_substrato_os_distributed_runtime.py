from __future__ import annotations

from substrato_os.runtime import SubstratoRuntime


def test_edge_node_registration_and_heartbeat(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "distributed.sqlite3")

    registered = runtime.register_edge_node(
        node_id="edge-maputo-1",
        region="maputo",
        role="worker",
        metadata={"cpu": "arm64"},
    )
    assert registered.node_id == "edge-maputo-1"
    assert registered.status == "online"

    heartbeat_ok = runtime.heartbeat_edge_node("edge-maputo-1", status="degraded")
    assert heartbeat_ok is True

    nodes = runtime.list_edge_nodes()
    assert len(nodes) == 1
    assert nodes[0].status == "degraded"


def test_distributed_replication_pull_and_ack(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "distributed.sqlite3")

    published = runtime.publish_distributed_event(
        name="billing.invoice.issued",
        payload={"invoice_id": "INV-001", "total": "120.00"},
        source_node_id="edge-maputo-1",
        tenant_id="tn-1",
    )

    replications_for_peer = runtime.pull_replication_for_node("edge-beira-1")
    assert len(replications_for_peer) == 1
    assert replications_for_peer[0].event_id == published.event_id

    replications_for_source = runtime.pull_replication_for_node("edge-maputo-1")
    assert replications_for_source == []

    runtime.ack_replication_for_node("edge-beira-1", replications_for_peer[0].replication_id)
    assert runtime.pull_replication_for_node("edge-beira-1") == []


def test_distributed_task_claim_by_region_and_completion(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "distributed.sqlite3")
    runtime.enqueue_distributed_task(
        "billing.reconciliation",
        {"invoice_id": "INV-42"},
        preferred_region="maputo",
    )

    not_eligible = runtime.claim_distributed_tasks(
        node_id="edge-beira-1",
        queue_name="billing.reconciliation",
        node_region="beira",
    )
    assert not_eligible == []

    claimed = runtime.claim_distributed_tasks(
        node_id="edge-maputo-1",
        queue_name="billing.reconciliation",
        node_region="maputo",
    )
    assert len(claimed) == 1

    completed = runtime.complete_distributed_task(
        task_id=claimed[0].task_id,
        node_id="edge-maputo-1",
    )
    assert completed is True
    assert runtime.claim_distributed_tasks(
        node_id="edge-maputo-1",
        queue_name="billing.reconciliation",
        node_region="maputo",
    ) == []


def test_distributed_task_retry_and_dead_letter(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "distributed.sqlite3")
    runtime.enqueue_distributed_task(
        "billing.sync",
        {"invoice_id": "INV-77"},
        max_attempts=2,
    )

    first_claim = runtime.claim_distributed_tasks(
        node_id="edge-maputo-1",
        queue_name="billing.sync",
    )
    assert len(first_claim) == 1
    first_status = runtime.fail_distributed_task(
        task_id=first_claim[0].task_id,
        node_id="edge-maputo-1",
        error="temporary timeout",
        retry_after_seconds=0,
    )
    assert first_status == "pending"

    second_claim = runtime.claim_distributed_tasks(
        node_id="edge-maputo-1",
        queue_name="billing.sync",
    )
    assert len(second_claim) == 1
    second_status = runtime.fail_distributed_task(
        task_id=second_claim[0].task_id,
        node_id="edge-maputo-1",
        error="permanent failure",
        retry_after_seconds=0,
    )
    assert second_status == "dead_letter"
    assert runtime.distributed.dead_letter_task_count("billing.sync") == 1
