from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
import json
import logging
from pathlib import Path
import sqlite3
from typing import Any
from uuid import uuid4

from .events import EventEnvelope, InMemoryEventStream
from .queue import QueueMessage, SQLiteTaskQueue

logger = logging.getLogger("substrato_os.workflow")

WorkflowCondition = Callable[[EventEnvelope], bool]
WorkflowAction = Callable[[EventEnvelope, "WorkflowContext"], None]
WorkflowPermissionResolver = Callable[[str], tuple[str, ...]]
WorkflowPermissionChecker = Callable[[str], None]


@dataclass(frozen=True, slots=True)
class WorkflowStep:
    name: str
    action: WorkflowAction


@dataclass(frozen=True, slots=True)
class WorkflowRule:
    name: str
    trigger_event: str
    steps: tuple[WorkflowStep, ...]
    condition: WorkflowCondition = lambda _event: True
    version: str = "1.0.0"
    module_key: str | None = None

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("Workflow name is required")
        if not self.trigger_event.strip():
            raise ValueError("Workflow trigger_event is required")
        if not self.version.strip():
            raise ValueError("Workflow version is required")


@dataclass(frozen=True, slots=True)
class WorkflowRun:
    run_id: str
    workflow_name: str
    workflow_version: str
    trigger_event_id: str
    trigger_event_name: str
    status: str
    started_at: datetime
    finished_at: datetime
    emitted_events: tuple[str, ...]
    enqueued_messages: tuple[str, ...]
    error: str | None = None


@dataclass(frozen=True, slots=True)
class WorkflowDefinitionRecord:
    workflow_name: str
    workflow_version: str
    trigger_event: str
    module_key: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SQLiteWorkflowStore:
    """
    Persists workflow definitions (with active version) and workflow runs.
    """

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = str(database_path)
        self._ensure_schema()

    def upsert_definition(self, rule: WorkflowRule, *, is_active: bool) -> WorkflowDefinitionRecord:
        now = datetime.now(tz=UTC).isoformat()
        with self._connection() as conn:
            conn.execute(
                """
                INSERT INTO substrato_workflow_definitions (
                    workflow_name,
                    workflow_version,
                    trigger_event,
                    module_key,
                    is_active,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(workflow_name, workflow_version) DO UPDATE SET
                    trigger_event = excluded.trigger_event,
                    module_key = excluded.module_key,
                    is_active = excluded.is_active,
                    updated_at = excluded.updated_at
                """,
                (
                    rule.name,
                    rule.version,
                    rule.trigger_event,
                    rule.module_key,
                    1 if is_active else 0,
                    now,
                    now,
                ),
            )
            row = conn.execute(
                """
                SELECT workflow_name, workflow_version, trigger_event, module_key, is_active, created_at, updated_at
                FROM substrato_workflow_definitions
                WHERE workflow_name = ? AND workflow_version = ?
                """,
                (rule.name, rule.version),
            ).fetchone()
        if row is None:
            raise RuntimeError("Failed to persist workflow definition")
        return self._row_to_definition(row)

    def set_active_version(self, workflow_name: str, workflow_version: str) -> bool:
        with self._connection() as conn:
            exists = conn.execute(
                """
                SELECT 1
                FROM substrato_workflow_definitions
                WHERE workflow_name = ? AND workflow_version = ?
                """,
                (workflow_name, workflow_version),
            ).fetchone()
            if exists is None:
                return False
            conn.execute(
                """
                UPDATE substrato_workflow_definitions
                SET is_active = CASE
                    WHEN workflow_version = ? THEN 1
                    ELSE 0
                END,
                updated_at = ?
                WHERE workflow_name = ?
                """,
                (
                    workflow_version,
                    datetime.now(tz=UTC).isoformat(),
                    workflow_name,
                ),
            )
        return True

    def active_version(self, workflow_name: str) -> str | None:
        with self._connection() as conn:
            row = conn.execute(
                """
                SELECT workflow_version
                FROM substrato_workflow_definitions
                WHERE workflow_name = ? AND is_active = 1
                LIMIT 1
                """,
                (workflow_name,),
            ).fetchone()
        if row is None:
            return None
        return str(row["workflow_version"])

    def list_definitions(
        self,
        *,
        workflow_name: str | None = None,
        active_only: bool = False,
    ) -> list[WorkflowDefinitionRecord]:
        clauses = ["1=1"]
        params: list[Any] = []
        if workflow_name is not None:
            clauses.append("workflow_name = ?")
            params.append(workflow_name)
        if active_only:
            clauses.append("is_active = 1")

        query = f"""
            SELECT workflow_name, workflow_version, trigger_event, module_key, is_active, created_at, updated_at
            FROM substrato_workflow_definitions
            WHERE {' AND '.join(clauses)}
            ORDER BY workflow_name ASC, workflow_version ASC
        """
        with self._connection() as conn:
            rows = conn.execute(query, tuple(params)).fetchall()
        return [self._row_to_definition(row) for row in rows]

    def record_run(self, run: WorkflowRun) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                INSERT INTO substrato_workflow_runs (
                    run_id,
                    workflow_name,
                    workflow_version,
                    trigger_event_id,
                    trigger_event_name,
                    status,
                    started_at,
                    finished_at,
                    emitted_events_json,
                    enqueued_messages_json,
                    error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run.run_id,
                    run.workflow_name,
                    run.workflow_version,
                    run.trigger_event_id,
                    run.trigger_event_name,
                    run.status,
                    run.started_at.isoformat(),
                    run.finished_at.isoformat(),
                    json.dumps(run.emitted_events),
                    json.dumps(run.enqueued_messages),
                    run.error,
                ),
            )

    def list_runs(
        self,
        *,
        workflow_name: str | None = None,
        status: str | None = None,
        limit: int = 100,
    ) -> list[WorkflowRun]:
        clauses = ["1=1"]
        params: list[Any] = []
        if workflow_name is not None:
            clauses.append("workflow_name = ?")
            params.append(workflow_name)
        if status is not None:
            clauses.append("status = ?")
            params.append(status)

        query = f"""
            SELECT
                run_id,
                workflow_name,
                workflow_version,
                trigger_event_id,
                trigger_event_name,
                status,
                started_at,
                finished_at,
                emitted_events_json,
                enqueued_messages_json,
                error
            FROM substrato_workflow_runs
            WHERE {' AND '.join(clauses)}
            ORDER BY started_at DESC
            LIMIT ?
        """
        params.append(max(1, int(limit)))
        with self._connection() as conn:
            rows = conn.execute(query, tuple(params)).fetchall()
        return [self._row_to_run(row) for row in rows]

    def _connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_workflow_definitions (
                    workflow_name TEXT NOT NULL,
                    workflow_version TEXT NOT NULL,
                    trigger_event TEXT NOT NULL,
                    module_key TEXT NULL,
                    is_active INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (workflow_name, workflow_version)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_workflow_runs (
                    run_id TEXT PRIMARY KEY,
                    workflow_name TEXT NOT NULL,
                    workflow_version TEXT NOT NULL,
                    trigger_event_id TEXT NOT NULL,
                    trigger_event_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    finished_at TEXT NOT NULL,
                    emitted_events_json TEXT NOT NULL,
                    enqueued_messages_json TEXT NOT NULL,
                    error TEXT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_workflow_definitions_event
                    ON substrato_workflow_definitions(trigger_event, is_active)
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_workflow_runs_name
                    ON substrato_workflow_runs(workflow_name, started_at)
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_workflow_runs_status
                    ON substrato_workflow_runs(status, started_at)
                """
            )

    def _row_to_definition(self, row: sqlite3.Row) -> WorkflowDefinitionRecord:
        return WorkflowDefinitionRecord(
            workflow_name=row["workflow_name"],
            workflow_version=row["workflow_version"],
            trigger_event=row["trigger_event"],
            module_key=row["module_key"],
            is_active=bool(row["is_active"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    def _row_to_run(self, row: sqlite3.Row) -> WorkflowRun:
        return WorkflowRun(
            run_id=row["run_id"],
            workflow_name=row["workflow_name"],
            workflow_version=row["workflow_version"],
            trigger_event_id=row["trigger_event_id"],
            trigger_event_name=row["trigger_event_name"],
            status=row["status"],
            started_at=datetime.fromisoformat(row["started_at"]),
            finished_at=datetime.fromisoformat(row["finished_at"]),
            emitted_events=tuple(json.loads(row["emitted_events_json"])),
            enqueued_messages=tuple(json.loads(row["enqueued_messages_json"])),
            error=row["error"],
        )


class WorkflowContext:
    def __init__(
        self,
        event_stream: InMemoryEventStream,
        *,
        task_queue: SQLiteTaskQueue | None = None,
        publish_source: str = "substrato.workflow",
        permission_checker: WorkflowPermissionChecker | None = None,
    ) -> None:
        self._event_stream = event_stream
        self._task_queue = task_queue
        self._publish_source = publish_source
        self._permission_checker = permission_checker
        self._emitted_event_ids: list[str] = []
        self._enqueued_message_ids: list[str] = []

    def emit(
        self,
        name: str,
        payload: dict[str, Any],
        *,
        tenant_id: str | None = None,
        source: str | None = None,
    ) -> EventEnvelope:
        if self._permission_checker is not None:
            self._permission_checker("events.emit")
        event = EventEnvelope(
            name=name,
            payload=payload,
            tenant_id=tenant_id,
            source=source or self._publish_source,
        )
        self._event_stream.publish(event)
        self._emitted_event_ids.append(event.event_id)
        return event

    @property
    def emitted_event_ids(self) -> tuple[str, ...]:
        return tuple(self._emitted_event_ids)

    def enqueue(
        self,
        queue_name: str,
        payload: dict[str, Any],
        *,
        tenant_id: str | None = None,
        source: str | None = None,
        dedupe_key: str | None = None,
        delay_seconds: int = 0,
        max_attempts: int = 5,
    ) -> QueueMessage:
        if self._permission_checker is not None:
            self._permission_checker("queue.enqueue")
        if self._task_queue is None:
            raise RuntimeError("Workflow queue integration not configured")
        message = self._task_queue.enqueue(
            queue_name=queue_name,
            payload=payload,
            tenant_id=tenant_id,
            source=source or self._publish_source,
            dedupe_key=dedupe_key,
            delay_seconds=delay_seconds,
            max_attempts=max_attempts,
        )
        self._enqueued_message_ids.append(message.message_id)
        return message

    @property
    def enqueued_message_ids(self) -> tuple[str, ...]:
        return tuple(self._enqueued_message_ids)


class WorkflowEngine:
    """
    Event-triggered workflow engine with rule versioning and persistent run history.
    """

    def __init__(
        self,
        event_stream: InMemoryEventStream,
        task_queue: SQLiteTaskQueue | None = None,
        workflow_store: SQLiteWorkflowStore | None = None,
        permission_resolver: WorkflowPermissionResolver | None = None,
    ) -> None:
        self._event_stream = event_stream
        self._task_queue = task_queue
        self._workflow_store = workflow_store
        self._permission_resolver = permission_resolver
        self._rules_by_event: dict[str, list[WorkflowRule]] = defaultdict(list)
        self._rules_by_key: dict[tuple[str, str], WorkflowRule] = {}
        self._active_versions: dict[str, str] = {}
        self._runs: list[WorkflowRun] = []

        if self._workflow_store is not None:
            for definition in self._workflow_store.list_definitions(active_only=True):
                self._active_versions[definition.workflow_name] = definition.workflow_version

    def register(self, rule: WorkflowRule) -> None:
        if not rule.steps:
            raise ValueError("Workflow must have at least one step")
        key = (rule.name, rule.version)
        if key in self._rules_by_key:
            raise ValueError(f"Workflow already registered: name={rule.name} version={rule.version}")

        self._rules_by_event[rule.trigger_event].append(rule)
        self._rules_by_key[key] = rule

        is_active = False
        if rule.name not in self._active_versions:
            self._active_versions[rule.name] = rule.version
            is_active = True
        elif self._active_versions[rule.name] == rule.version:
            is_active = True

        if self._workflow_store is not None:
            self._workflow_store.upsert_definition(rule, is_active=is_active)

    def activate_workflow_version(self, workflow_name: str, workflow_version: str) -> WorkflowRule:
        key = (workflow_name, workflow_version)
        rule = self._rules_by_key.get(key)
        if rule is None:
            raise ValueError(f"Unknown workflow version: name={workflow_name} version={workflow_version}")
        self._active_versions[workflow_name] = workflow_version
        if self._workflow_store is not None:
            persisted = self._workflow_store.set_active_version(workflow_name, workflow_version)
            if not persisted:
                self._workflow_store.upsert_definition(rule, is_active=True)
                self._workflow_store.set_active_version(workflow_name, workflow_version)
        return rule

    def active_workflow_version(self, workflow_name: str) -> str | None:
        return self._active_versions.get(workflow_name)

    def definitions(
        self,
        *,
        workflow_name: str | None = None,
        active_only: bool = False,
    ) -> tuple[WorkflowDefinitionRecord, ...]:
        if self._workflow_store is not None:
            return tuple(
                self._workflow_store.list_definitions(
                    workflow_name=workflow_name,
                    active_only=active_only,
                )
            )

        now = datetime.now(tz=UTC)
        records: list[WorkflowDefinitionRecord] = []
        for rule in self._rules_by_key.values():
            if workflow_name is not None and rule.name != workflow_name:
                continue
            is_active = self._active_versions.get(rule.name) == rule.version
            if active_only and not is_active:
                continue
            records.append(
                WorkflowDefinitionRecord(
                    workflow_name=rule.name,
                    workflow_version=rule.version,
                    trigger_event=rule.trigger_event,
                    module_key=rule.module_key,
                    is_active=is_active,
                    created_at=now,
                    updated_at=now,
                )
            )
        records.sort(key=lambda item: (item.workflow_name, item.workflow_version))
        return tuple(records)

    def list_runs(
        self,
        *,
        workflow_name: str | None = None,
        status: str | None = None,
        limit: int = 100,
    ) -> tuple[WorkflowRun, ...]:
        if self._workflow_store is not None:
            return tuple(
                self._workflow_store.list_runs(
                    workflow_name=workflow_name,
                    status=status,
                    limit=limit,
                )
            )
        runs = self._runs
        if workflow_name is not None:
            runs = [run for run in runs if run.workflow_name == workflow_name]
        if status is not None:
            runs = [run for run in runs if run.status == status]
        return tuple(runs[-max(1, int(limit)) :])

    def handle_event(self, event: EventEnvelope) -> list[WorkflowRun]:
        workflow_runs: list[WorkflowRun] = []
        for rule in self._rules_by_event.get(event.name, []):
            active_version = self._active_versions.get(rule.name, rule.version)
            if rule.version != active_version:
                continue
            if not rule.condition(event):
                continue
            run = self._execute_rule(rule=rule, event=event)
            self._runs.append(run)
            if self._workflow_store is not None:
                self._workflow_store.record_run(run)
            workflow_runs.append(run)
        return workflow_runs

    @property
    def runs(self) -> tuple[WorkflowRun, ...]:
        return tuple(self._runs)

    def _execute_rule(self, rule: WorkflowRule, event: EventEnvelope) -> WorkflowRun:
        started_at = datetime.now(tz=UTC)
        context = WorkflowContext(
            event_stream=self._event_stream,
            task_queue=self._task_queue,
            permission_checker=self._permission_checker_for_rule(rule),
        )
        status = "completed"
        error_message: str | None = None
        try:
            for step in rule.steps:
                step.action(event, context)
        except Exception as exc:
            status = "failed"
            error_message = str(exc)
            logger.exception("Workflow execution failed workflow=%s event=%s", rule.name, event.name)
        finished_at = datetime.now(tz=UTC)
        return WorkflowRun(
            run_id=str(uuid4()),
            workflow_name=rule.name,
            workflow_version=rule.version,
            trigger_event_id=event.event_id,
            trigger_event_name=event.name,
            status=status,
            started_at=started_at,
            finished_at=finished_at,
            emitted_events=context.emitted_event_ids,
            enqueued_messages=context.enqueued_message_ids,
            error=error_message,
        )

    def _permission_checker_for_rule(self, rule: WorkflowRule) -> WorkflowPermissionChecker | None:
        if rule.module_key is None or self._permission_resolver is None:
            return None
        try:
            allowed_permissions = set(self._permission_resolver(rule.module_key))
        except Exception as exc:
            raise PermissionError(
                f"Failed to resolve permissions for module={rule.module_key}: {exc}"
            ) from exc

        def checker(permission: str) -> None:
            if permission not in allowed_permissions:
                raise PermissionError(
                    f"Module {rule.module_key} missing permission: {permission}"
                )

        return checker

