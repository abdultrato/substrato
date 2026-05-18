from __future__ import annotations

import pytest

from substrato_os.events import EventEnvelope, InMemoryEventStream
from substrato_os.modules import ModuleLoadError, ModuleManifest, ModuleRegistry, ModuleState
from substrato_os.offline import SQLiteOutbox
from substrato_os.queue import SQLiteTaskQueue
from substrato_os.runtime import SubstratoRuntime
from substrato_os.workflow import WorkflowRule, WorkflowStep


def test_module_registry_loads_dependencies_in_order() -> None:
    load_trace: list[str] = []
    registry = ModuleRegistry()

    registry.register(
        ModuleManifest(
            key="substrato.modules.core",
            version="1.0.0",
            entrypoint=lambda: load_trace.append("core"),
        )
    )
    registry.register(
        ModuleManifest(
            key="substrato.modules.financeiro",
            version="1.0.0",
            dependencies=("substrato.modules.core",),
            entrypoint=lambda: load_trace.append("financeiro"),
        )
    )

    registry.load("substrato.modules.financeiro")

    assert load_trace == ["core", "financeiro"]
    assert registry.load_order == ("substrato.modules.core", "substrato.modules.financeiro")
    assert registry.state_of("substrato.modules.financeiro") is ModuleState.LOADED


def test_module_registry_marks_failed_module() -> None:
    registry = ModuleRegistry()

    def fail_entrypoint() -> None:
        raise RuntimeError("boot failed")

    registry.register(
        ModuleManifest(
            key="substrato.modules.rh",
            version="1.0.0",
            entrypoint=fail_entrypoint,
        )
    )

    with pytest.raises(ModuleLoadError):
        registry.load("substrato.modules.rh")

    assert registry.state_of("substrato.modules.rh") is ModuleState.FAILED


def test_workflow_engine_emits_follow_up_event_when_condition_matches() -> None:
    stream = InMemoryEventStream()
    emitted_names: list[str] = []
    stream.subscribe("*", lambda event: emitted_names.append(event.name))

    from substrato_os.workflow import WorkflowEngine

    engine = WorkflowEngine(event_stream=stream)
    stream.subscribe("*", engine.handle_event)

    rule = WorkflowRule(
        name="restock_when_low",
        trigger_event="inventory.stock.updated",
        condition=lambda event: event.payload["stock"] < event.payload["min_stock"],
        steps=(
            WorkflowStep(
                name="emit_restock_request",
                action=lambda event, context: context.emit(
                    "inventory.restock.requested",
                    {
                        "product_id": event.payload["product_id"],
                        "stock": event.payload["stock"],
                        "min_stock": event.payload["min_stock"],
                    },
                    tenant_id=event.tenant_id,
                ),
            ),
        ),
    )
    engine.register(rule)

    stream.publish(
        EventEnvelope(
            name="inventory.stock.updated",
            payload={"product_id": "P-1", "stock": 3, "min_stock": 5},
            tenant_id="clinic-1",
        )
    )

    assert "inventory.restock.requested" in emitted_names
    assert len(engine.runs) == 1
    assert engine.runs[0].status == "completed"


def test_sqlite_outbox_replay_retries_then_delivers(tmp_path) -> None:
    outbox = SQLiteOutbox(tmp_path / "outbox.sqlite3")
    outbox.enqueue(EventEnvelope(name="sync.entity.updated", payload={"entity_id": "E-1"}))

    attempts = {"count": 0}

    def flaky_publisher(_event: EventEnvelope) -> None:
        attempts["count"] += 1
        if attempts["count"] == 1:
            raise RuntimeError("temporary network issue")

    first_replay = outbox.replay(flaky_publisher, retry_after_seconds=0)
    second_replay = outbox.replay(flaky_publisher, retry_after_seconds=0)

    assert first_replay.failed == 1
    assert second_replay.delivered == 1
    assert outbox.pending_count() == 0


def test_runtime_offline_publish_and_sync(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "runtime-outbox.sqlite3")
    received_ids: list[str] = []
    runtime.event_stream.subscribe("patient.created", lambda event: received_ids.append(event.event_id))

    created = runtime.publish_event(
        name="patient.created",
        payload={"patient_id": "PT-100"},
        tenant_id="clinic-1",
        offline=True,
    )

    assert runtime.pending_outbox_events == 1
    assert created.event_id not in received_ids

    sync_result = runtime.sync_outbox(retry_after_seconds=0)

    assert sync_result.delivered == 1
    assert sync_result.remaining == 0
    assert created.event_id in received_ids


def test_sqlite_task_queue_retries_and_dead_letters(tmp_path) -> None:
    queue = SQLiteTaskQueue(tmp_path / "task-queue.sqlite3")
    queue.enqueue(
        queue_name="billing.reconciliation",
        payload={"invoice_id": "INV-42"},
        max_attempts=2,
    )

    def always_fail(_message: object) -> None:
        raise RuntimeError("gateway offline")

    first_process = queue.process(
        queue_name="billing.reconciliation",
        handler=always_fail,
        retry_after_seconds=0,
    )
    second_process = queue.process(
        queue_name="billing.reconciliation",
        handler=always_fail,
        retry_after_seconds=0,
    )

    assert first_process.failed == 1
    assert first_process.dead_lettered == 0
    assert second_process.failed == 1
    assert second_process.dead_lettered == 1
    assert queue.pending_count("billing.reconciliation") == 0
    assert queue.dead_letter_count("billing.reconciliation") == 1


def test_runtime_workflow_can_enqueue_automation_tasks(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "runtime.sqlite3")
    processed: list[str] = []

    runtime.register_workflow(
        WorkflowRule(
            name="restock_task_when_stock_low",
            trigger_event="inventory.stock.updated",
            condition=lambda event: event.payload["stock"] < event.payload["min_stock"],
            steps=(
                WorkflowStep(
                    name="enqueue_restock",
                    action=lambda event, context: context.enqueue(
                        "inventory.restock",
                        {
                            "product_id": event.payload["product_id"],
                            "stock": event.payload["stock"],
                            "min_stock": event.payload["min_stock"],
                        },
                        tenant_id=event.tenant_id,
                        dedupe_key=f"restock:{event.payload['product_id']}",
                    ),
                ),
            ),
        )
    )

    runtime.publish_event(
        name="inventory.stock.updated",
        payload={"product_id": "P-22", "stock": 1, "min_stock": 5},
        tenant_id="clinic-1",
    )

    assert runtime.pending_queue_messages("inventory.restock") == 1
    assert runtime.workflow_engine.runs[0].enqueued_messages

    processed_result = runtime.process_queue(
        "inventory.restock",
        handler=lambda message: processed.append(message.payload["product_id"]),
        retry_after_seconds=0,
    )

    assert processed == ["P-22"]
    assert processed_result.succeeded == 1
    assert processed_result.remaining == 0
