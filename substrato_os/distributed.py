from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import json
from pathlib import Path
import sqlite3
from typing import Any
from uuid import uuid4

from .events import EventEnvelope


@dataclass(frozen=True, slots=True)
class EdgeNode:
    node_id: str
    region: str
    role: str
    metadata: dict[str, Any]
    status: str
    registered_at: datetime
    last_seen_at: datetime


@dataclass(frozen=True, slots=True)
class ReplicationEntry:
    replication_id: str
    event_id: str
    event_name: str
    payload: dict[str, Any]
    tenant_id: str | None
    source_node_id: str | None
    created_at: datetime


@dataclass(frozen=True, slots=True)
class DistributedTask:
    task_id: str
    queue_name: str
    payload: dict[str, Any]
    tenant_id: str | None
    preferred_region: str | None
    status: str
    attempts: int
    max_attempts: int
    available_at: datetime
    lease_owner: str | None
    lease_expires_at: datetime | None
    last_error: str | None
    created_at: datetime
    updated_at: datetime


class SQLiteDistributedRuntime:
    """
    Persistent primitives for edge node registry, replication and decentralized execution.
    """

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = str(database_path)
        self._ensure_schema()

    def register_node(
        self,
        *,
        node_id: str,
        region: str,
        role: str = "worker",
        metadata: dict[str, Any] | None = None,
        status: str = "online",
    ) -> EdgeNode:
        now = datetime.now(tz=UTC)
        existing = self.get_node(node_id)
        registered_at = existing.registered_at if existing else now
        with self._connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO substrato_edge_nodes (
                    node_id,
                    region,
                    role,
                    metadata_json,
                    status,
                    registered_at,
                    last_seen_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    node_id,
                    region,
                    role,
                    json.dumps(metadata or {}),
                    status,
                    registered_at.isoformat(),
                    now.isoformat(),
                ),
            )
        node = self.get_node(node_id)
        if not node:
            raise RuntimeError(f"Falha ao registrar node={node_id}")
        return node

    def heartbeat(self, node_id: str, *, status: str = "online") -> bool:
        now = datetime.now(tz=UTC)
        with self._connection() as conn:
            result = conn.execute(
                """
                UPDATE substrato_edge_nodes
                SET last_seen_at = ?, status = ?
                WHERE node_id = ?
                """,
                (now.isoformat(), status, node_id),
            )
        return result.rowcount > 0

    def get_node(self, node_id: str) -> EdgeNode | None:
        with self._connection() as conn:
            row = conn.execute(
                """
                SELECT node_id, region, role, metadata_json, status, registered_at, last_seen_at
                FROM substrato_edge_nodes
                WHERE node_id = ?
                """,
                (node_id,),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_node(row)

    def list_nodes(
        self,
        *,
        only_online: bool = False,
        stale_after_seconds: int | None = None,
    ) -> list[EdgeNode]:
        clauses: list[str] = []
        params: list[Any] = []
        if only_online:
            clauses.append("status = 'online'")
        if stale_after_seconds is not None:
            threshold = datetime.now(tz=UTC) - timedelta(seconds=max(stale_after_seconds, 0))
            clauses.append("last_seen_at >= ?")
            params.append(threshold.isoformat())

        where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with self._connection() as conn:
            rows = conn.execute(
                f"""
                SELECT node_id, region, role, metadata_json, status, registered_at, last_seen_at
                FROM substrato_edge_nodes
                {where_clause}
                ORDER BY node_id ASC
                """,
                tuple(params),
            ).fetchall()
        return [self._row_to_node(row) for row in rows]

    def append_replication(self, event: EventEnvelope, *, source_node_id: str | None = None) -> ReplicationEntry:
        replication_id = str(uuid4())
        now = datetime.now(tz=UTC)
        with self._connection() as conn:
            conn.execute(
                """
                INSERT INTO substrato_replication_log (
                    replication_id,
                    event_id,
                    event_name,
                    payload_json,
                    tenant_id,
                    source_node_id,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    replication_id,
                    event.event_id,
                    event.name,
                    json.dumps(event.payload),
                    event.tenant_id,
                    source_node_id,
                    now.isoformat(),
                ),
            )
        with self._connection() as conn:
            row = conn.execute(
                """
                SELECT replication_id, event_id, event_name, payload_json, tenant_id, source_node_id, created_at
                FROM substrato_replication_log
                WHERE replication_id = ?
                """,
                (replication_id,),
            ).fetchone()
        if row is None:
            raise RuntimeError("Falha ao registrar evento de replicação")
        return self._row_to_replication(row)

    def pull_replication(self, node_id: str, *, limit: int = 100) -> list[ReplicationEntry]:
        with self._connection() as conn:
            rows = conn.execute(
                """
                SELECT
                    r.replication_id,
                    r.event_id,
                    r.event_name,
                    r.payload_json,
                    r.tenant_id,
                    r.source_node_id,
                    r.created_at
                FROM substrato_replication_log r
                LEFT JOIN substrato_replication_ack a
                    ON a.replication_id = r.replication_id AND a.node_id = ?
                WHERE a.replication_id IS NULL
                  AND (r.source_node_id IS NULL OR r.source_node_id != ?)
                ORDER BY r.created_at ASC
                LIMIT ?
                """,
                (node_id, node_id, limit),
            ).fetchall()
        return [self._row_to_replication(row) for row in rows]

    def ack_replication(self, node_id: str, replication_id: str) -> None:
        now = datetime.now(tz=UTC)
        with self._connection() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO substrato_replication_ack (
                    replication_id,
                    node_id,
                    acked_at
                ) VALUES (?, ?, ?)
                """,
                (replication_id, node_id, now.isoformat()),
            )

    def enqueue_task(
        self,
        *,
        queue_name: str,
        payload: dict[str, Any],
        tenant_id: str | None = None,
        preferred_region: str | None = None,
        delay_seconds: int = 0,
        max_attempts: int = 5,
    ) -> DistributedTask:
        now = datetime.now(tz=UTC)
        task_id = str(uuid4())
        available_at = now + timedelta(seconds=max(delay_seconds, 0))
        with self._connection() as conn:
            conn.execute(
                """
                INSERT INTO substrato_distributed_tasks (
                    task_id,
                    queue_name,
                    payload_json,
                    tenant_id,
                    preferred_region,
                    status,
                    attempts,
                    max_attempts,
                    available_at,
                    lease_owner,
                    lease_expires_at,
                    last_error,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, NULL, NULL, NULL, ?, ?)
                """,
                (
                    task_id,
                    queue_name,
                    json.dumps(payload),
                    tenant_id,
                    preferred_region,
                    max(1, int(max_attempts)),
                    available_at.isoformat(),
                    now.isoformat(),
                    now.isoformat(),
                ),
            )
        task = self._get_task(task_id)
        if not task:
            raise RuntimeError("Falha ao enfileirar tarefa distribuída")
        return task

    def claim_tasks(
        self,
        *,
        node_id: str,
        queue_name: str,
        limit: int = 50,
        lease_seconds: int = 30,
        node_region: str | None = None,
    ) -> list[DistributedTask]:
        now = datetime.now(tz=UTC)
        now_iso = now.isoformat()
        lease_expires_at = (now + timedelta(seconds=max(lease_seconds, 1))).isoformat()

        filters = [
            "queue_name = ?",
            "available_at <= ?",
            "(status = 'pending' OR (status = 'claimed' AND lease_expires_at <= ?))",
        ]
        params: list[Any] = [queue_name, now_iso, now_iso]
        if node_region is not None:
            filters.append("(preferred_region IS NULL OR preferred_region = ?)")
            params.append(node_region)

        where_clause = " AND ".join(filters)
        claimed: list[DistributedTask] = []
        with self._connection() as conn:
            rows = conn.execute(
                f"""
                SELECT task_id
                FROM substrato_distributed_tasks
                WHERE {where_clause}
                ORDER BY available_at ASC, created_at ASC
                LIMIT ?
                """,
                (*params, limit),
            ).fetchall()

            for row in rows:
                task_id = row["task_id"]
                updated = conn.execute(
                    """
                    UPDATE substrato_distributed_tasks
                    SET status = 'claimed',
                        lease_owner = ?,
                        lease_expires_at = ?,
                        updated_at = ?
                    WHERE task_id = ?
                      AND (
                          status = 'pending'
                          OR (status = 'claimed' AND lease_expires_at <= ?)
                      )
                    """,
                    (node_id, lease_expires_at, now_iso, task_id, now_iso),
                )
                if updated.rowcount <= 0:
                    continue
                task_row = conn.execute(
                    """
                    SELECT
                        task_id,
                        queue_name,
                        payload_json,
                        tenant_id,
                        preferred_region,
                        status,
                        attempts,
                        max_attempts,
                        available_at,
                        lease_owner,
                        lease_expires_at,
                        last_error,
                        created_at,
                        updated_at
                    FROM substrato_distributed_tasks
                    WHERE task_id = ?
                    """,
                    (task_id,),
                ).fetchone()
                if task_row:
                    claimed.append(self._row_to_task(task_row))
        return claimed

    def complete_task(self, *, task_id: str, node_id: str) -> bool:
        now = datetime.now(tz=UTC).isoformat()
        with self._connection() as conn:
            result = conn.execute(
                """
                UPDATE substrato_distributed_tasks
                SET status = 'completed',
                    lease_owner = NULL,
                    lease_expires_at = NULL,
                    last_error = NULL,
                    updated_at = ?
                WHERE task_id = ? AND status = 'claimed' AND lease_owner = ?
                """,
                (now, task_id, node_id),
            )
        return result.rowcount > 0

    def fail_task(
        self,
        *,
        task_id: str,
        node_id: str,
        error: str,
        retry_after_seconds: int = 30,
    ) -> str:
        task = self._get_task(task_id)
        if task is None:
            return "missing"
        if task.status != "claimed" or task.lease_owner != node_id:
            return "not_owned"

        next_attempt = task.attempts + 1
        dead_letter = next_attempt >= task.max_attempts
        status = "dead_letter" if dead_letter else "pending"
        next_available_at = (
            datetime.now(tz=UTC)
            if dead_letter
            else datetime.now(tz=UTC) + timedelta(seconds=max(retry_after_seconds, 0))
        )
        now_iso = datetime.now(tz=UTC).isoformat()
        with self._connection() as conn:
            conn.execute(
                """
                UPDATE substrato_distributed_tasks
                SET status = ?,
                    attempts = ?,
                    available_at = ?,
                    lease_owner = NULL,
                    lease_expires_at = NULL,
                    last_error = ?,
                    updated_at = ?
                WHERE task_id = ?
                """,
                (
                    status,
                    next_attempt,
                    next_available_at.isoformat(),
                    error,
                    now_iso,
                    task_id,
                ),
            )
        return status

    def pending_task_count(self, queue_name: str | None = None) -> int:
        query = "SELECT COUNT(*) AS count FROM substrato_distributed_tasks WHERE status = 'pending'"
        params: tuple[Any, ...] = ()
        if queue_name is not None:
            query += " AND queue_name = ?"
            params = (queue_name,)
        with self._connection() as conn:
            row = conn.execute(query, params).fetchone()
        return int(row["count"])

    def dead_letter_task_count(self, queue_name: str | None = None) -> int:
        query = "SELECT COUNT(*) AS count FROM substrato_distributed_tasks WHERE status = 'dead_letter'"
        params: tuple[Any, ...] = ()
        if queue_name is not None:
            query += " AND queue_name = ?"
            params = (queue_name,)
        with self._connection() as conn:
            row = conn.execute(query, params).fetchone()
        return int(row["count"])

    def _get_task(self, task_id: str) -> DistributedTask | None:
        with self._connection() as conn:
            row = conn.execute(
                """
                SELECT
                    task_id,
                    queue_name,
                    payload_json,
                    tenant_id,
                    preferred_region,
                    status,
                    attempts,
                    max_attempts,
                    available_at,
                    lease_owner,
                    lease_expires_at,
                    last_error,
                    created_at,
                    updated_at
                FROM substrato_distributed_tasks
                WHERE task_id = ?
                """,
                (task_id,),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_task(row)

    def _connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_edge_nodes (
                    node_id TEXT PRIMARY KEY,
                    region TEXT NOT NULL,
                    role TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    status TEXT NOT NULL,
                    registered_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_replication_log (
                    replication_id TEXT PRIMARY KEY,
                    event_id TEXT NOT NULL,
                    event_name TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    tenant_id TEXT NULL,
                    source_node_id TEXT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_replication_ack (
                    replication_id TEXT NOT NULL,
                    node_id TEXT NOT NULL,
                    acked_at TEXT NOT NULL,
                    PRIMARY KEY (replication_id, node_id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_distributed_tasks (
                    task_id TEXT PRIMARY KEY,
                    queue_name TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    tenant_id TEXT NULL,
                    preferred_region TEXT NULL,
                    status TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    max_attempts INTEGER NOT NULL DEFAULT 5,
                    available_at TEXT NOT NULL,
                    lease_owner TEXT NULL,
                    lease_expires_at TEXT NULL,
                    last_error TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_edge_nodes_seen
                    ON substrato_edge_nodes(status, last_seen_at)
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_replication_created
                    ON substrato_replication_log(created_at)
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_distributed_tasks_claim
                    ON substrato_distributed_tasks(queue_name, status, available_at, lease_expires_at)
                """
            )

    def _row_to_node(self, row: sqlite3.Row) -> EdgeNode:
        return EdgeNode(
            node_id=row["node_id"],
            region=row["region"],
            role=row["role"],
            metadata=json.loads(row["metadata_json"]),
            status=row["status"],
            registered_at=datetime.fromisoformat(row["registered_at"]),
            last_seen_at=datetime.fromisoformat(row["last_seen_at"]),
        )

    def _row_to_replication(self, row: sqlite3.Row) -> ReplicationEntry:
        return ReplicationEntry(
            replication_id=row["replication_id"],
            event_id=row["event_id"],
            event_name=row["event_name"],
            payload=json.loads(row["payload_json"]),
            tenant_id=row["tenant_id"],
            source_node_id=row["source_node_id"],
            created_at=datetime.fromisoformat(row["created_at"]),
        )

    def _row_to_task(self, row: sqlite3.Row) -> DistributedTask:
        lease_expires_at = row["lease_expires_at"]
        return DistributedTask(
            task_id=row["task_id"],
            queue_name=row["queue_name"],
            payload=json.loads(row["payload_json"]),
            tenant_id=row["tenant_id"],
            preferred_region=row["preferred_region"],
            status=row["status"],
            attempts=int(row["attempts"]),
            max_attempts=int(row["max_attempts"]),
            available_at=datetime.fromisoformat(row["available_at"]),
            lease_owner=row["lease_owner"],
            lease_expires_at=datetime.fromisoformat(lease_expires_at) if lease_expires_at else None,
            last_error=row["last_error"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )
