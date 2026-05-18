from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import json
from pathlib import Path
import sqlite3
from typing import Any
from uuid import uuid4


@dataclass(frozen=True, slots=True)
class QueueMessage:
    message_id: str
    queue_name: str
    payload: dict[str, Any]
    tenant_id: str | None
    source: str
    status: str
    attempts: int
    max_attempts: int
    available_at: datetime
    created_at: datetime
    dedupe_key: str | None = None
    last_error: str | None = None


@dataclass(frozen=True, slots=True)
class QueueProcessResult:
    processed: int
    succeeded: int
    failed: int
    dead_lettered: int
    remaining: int


QueueHandler = Callable[[QueueMessage], None]


class SQLiteTaskQueue:
    """
    Persistent work queue with retry and dead-letter support.
    """

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = str(database_path)
        self._ensure_schema()

    def enqueue(
        self,
        *,
        queue_name: str,
        payload: dict[str, Any],
        tenant_id: str | None = None,
        source: str = "substrato.runtime",
        dedupe_key: str | None = None,
        delay_seconds: int = 0,
        max_attempts: int = 5,
    ) -> QueueMessage:
        now = datetime.now(tz=UTC)
        available_at = now + timedelta(seconds=max(delay_seconds, 0))
        message_id = str(uuid4())
        safe_max_attempts = max(1, int(max_attempts))

        with self._connection() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO substrato_task_queue (
                    message_id,
                    queue_name,
                    payload_json,
                    tenant_id,
                    source,
                    status,
                    attempts,
                    max_attempts,
                    available_at,
                    created_at,
                    last_error,
                    dedupe_key
                ) VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?, NULL, ?)
                """,
                (
                    message_id,
                    queue_name,
                    json.dumps(payload),
                    tenant_id,
                    source,
                    safe_max_attempts,
                    available_at.isoformat(),
                    now.isoformat(),
                    dedupe_key,
                ),
            )

        if dedupe_key is not None:
            existing = self._fetch_by_dedupe_key(queue_name=queue_name, dedupe_key=dedupe_key)
            if existing:
                return existing

        message = self._fetch_by_id(message_id)
        if not message:
            raise RuntimeError("Falha ao enfileirar mensagem")
        return message

    def fetch_ready(
        self,
        *,
        queue_name: str,
        limit: int = 100,
        now: datetime | None = None,
    ) -> list[QueueMessage]:
        due = now or datetime.now(tz=UTC)
        with self._connection() as conn:
            rows = conn.execute(
                """
                SELECT
                    message_id,
                    queue_name,
                    payload_json,
                    tenant_id,
                    source,
                    status,
                    attempts,
                    max_attempts,
                    available_at,
                    created_at,
                    last_error,
                    dedupe_key
                FROM substrato_task_queue
                WHERE queue_name = ? AND status = 'pending' AND available_at <= ?
                ORDER BY available_at ASC, created_at ASC
                LIMIT ?
                """,
                (queue_name, due.isoformat(), limit),
            ).fetchall()
        return [self._row_to_message(row) for row in rows]

    def mark_succeeded(self, message_id: str) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                UPDATE substrato_task_queue
                SET status = 'delivered', last_error = NULL
                WHERE message_id = ?
                """,
                (message_id,),
            )

    def mark_failed(self, *, message_id: str, error: str, retry_after_seconds: int = 30) -> str:
        message = self._fetch_by_id(message_id)
        if not message:
            return "missing"

        next_attempt = message.attempts + 1
        dead_letter = next_attempt >= message.max_attempts
        status = "dead_letter" if dead_letter else "pending"
        available_at = (
            datetime.now(tz=UTC)
            if dead_letter
            else datetime.now(tz=UTC) + timedelta(seconds=max(retry_after_seconds, 0))
        )

        with self._connection() as conn:
            conn.execute(
                """
                UPDATE substrato_task_queue
                SET status = ?,
                    attempts = ?,
                    available_at = ?,
                    last_error = ?
                WHERE message_id = ?
                """,
                (
                    status,
                    next_attempt,
                    available_at.isoformat(),
                    error,
                    message_id,
                ),
            )
        return status

    def process(
        self,
        *,
        queue_name: str,
        handler: QueueHandler,
        limit: int = 100,
        retry_after_seconds: int = 30,
    ) -> QueueProcessResult:
        processed = 0
        succeeded = 0
        failed = 0
        dead_lettered = 0

        for message in self.fetch_ready(queue_name=queue_name, limit=limit):
            processed += 1
            try:
                handler(message)
            except Exception as exc:
                failed += 1
                status = self.mark_failed(
                    message_id=message.message_id,
                    error=str(exc),
                    retry_after_seconds=retry_after_seconds,
                )
                if status == "dead_letter":
                    dead_lettered += 1
            else:
                succeeded += 1
                self.mark_succeeded(message.message_id)

        return QueueProcessResult(
            processed=processed,
            succeeded=succeeded,
            failed=failed,
            dead_lettered=dead_lettered,
            remaining=self.pending_count(queue_name=queue_name),
        )

    def pending_count(self, queue_name: str | None = None) -> int:
        query = "SELECT COUNT(*) AS count FROM substrato_task_queue WHERE status = 'pending'"
        params: tuple[Any, ...] = ()
        if queue_name is not None:
            query += " AND queue_name = ?"
            params = (queue_name,)
        with self._connection() as conn:
            row = conn.execute(query, params).fetchone()
        return int(row["count"])

    def dead_letter_count(self, queue_name: str | None = None) -> int:
        query = "SELECT COUNT(*) AS count FROM substrato_task_queue WHERE status = 'dead_letter'"
        params: tuple[Any, ...] = ()
        if queue_name is not None:
            query += " AND queue_name = ?"
            params = (queue_name,)
        with self._connection() as conn:
            row = conn.execute(query, params).fetchone()
        return int(row["count"])

    def _fetch_by_id(self, message_id: str) -> QueueMessage | None:
        with self._connection() as conn:
            row = conn.execute(
                """
                SELECT
                    message_id,
                    queue_name,
                    payload_json,
                    tenant_id,
                    source,
                    status,
                    attempts,
                    max_attempts,
                    available_at,
                    created_at,
                    last_error,
                    dedupe_key
                FROM substrato_task_queue
                WHERE message_id = ?
                """,
                (message_id,),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_message(row)

    def _fetch_by_dedupe_key(self, *, queue_name: str, dedupe_key: str) -> QueueMessage | None:
        with self._connection() as conn:
            row = conn.execute(
                """
                SELECT
                    message_id,
                    queue_name,
                    payload_json,
                    tenant_id,
                    source,
                    status,
                    attempts,
                    max_attempts,
                    available_at,
                    created_at,
                    last_error,
                    dedupe_key
                FROM substrato_task_queue
                WHERE queue_name = ? AND dedupe_key = ?
                LIMIT 1
                """,
                (queue_name, dedupe_key),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_message(row)

    def _connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_task_queue (
                    message_id TEXT PRIMARY KEY,
                    queue_name TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    tenant_id TEXT NULL,
                    source TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    attempts INTEGER NOT NULL DEFAULT 0,
                    max_attempts INTEGER NOT NULL DEFAULT 5,
                    available_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    last_error TEXT NULL,
                    dedupe_key TEXT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_task_queue_ready
                    ON substrato_task_queue(queue_name, status, available_at)
                """
            )
            conn.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_substrato_task_queue_dedupe
                    ON substrato_task_queue(queue_name, dedupe_key)
                    WHERE dedupe_key IS NOT NULL
                """
            )

    def _row_to_message(self, row: sqlite3.Row) -> QueueMessage:
        return QueueMessage(
            message_id=row["message_id"],
            queue_name=row["queue_name"],
            payload=json.loads(row["payload_json"]),
            tenant_id=row["tenant_id"],
            source=row["source"],
            status=row["status"],
            attempts=int(row["attempts"]),
            max_attempts=int(row["max_attempts"]),
            available_at=datetime.fromisoformat(row["available_at"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            last_error=row["last_error"],
            dedupe_key=row["dedupe_key"],
        )
