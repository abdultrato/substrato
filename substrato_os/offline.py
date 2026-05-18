from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import json
from pathlib import Path
import sqlite3

from .events import EventEnvelope


@dataclass(frozen=True, slots=True)
class OutboxEventRecord:
    event: EventEnvelope
    attempts: int
    available_at: datetime
    last_error: str | None = None


@dataclass(frozen=True, slots=True)
class OutboxReplayResult:
    delivered: int
    failed: int
    remaining: int


class SQLiteOutbox:
    """
    Persistent outbox for offline-first event delivery.
    """

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = str(database_path)
        self._ensure_schema()

    def enqueue(self, event: EventEnvelope) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO substrato_outbox_events (
                    event_id,
                    event_name,
                    payload_json,
                    tenant_id,
                    source,
                    occurred_at,
                    status,
                    attempts,
                    available_at,
                    last_error
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, NULL)
                """,
                (
                    event.event_id,
                    event.name,
                    json.dumps(event.payload),
                    event.tenant_id,
                    event.source,
                    event.occurred_at.isoformat(),
                    event.occurred_at.isoformat(),
                ),
            )

    def fetch_pending(self, limit: int = 100, now: datetime | None = None) -> list[OutboxEventRecord]:
        due_time = now or datetime.now(tz=UTC)
        with self._connection() as conn:
            rows = conn.execute(
                """
                SELECT event_id, event_name, payload_json, tenant_id, source, occurred_at, attempts, available_at, last_error
                FROM substrato_outbox_events
                WHERE status = 'pending' AND available_at <= ?
                ORDER BY available_at ASC
                LIMIT ?
                """,
                (due_time.isoformat(), limit),
            ).fetchall()
        return [self._row_to_record(row) for row in rows]

    def mark_delivered(self, event_id: str) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                UPDATE substrato_outbox_events
                SET status = 'delivered', last_error = NULL
                WHERE event_id = ?
                """,
                (event_id,),
            )

    def mark_failed(self, event_id: str, error: str, retry_after_seconds: int = 30) -> None:
        retry_at = datetime.now(tz=UTC) + timedelta(seconds=retry_after_seconds)
        with self._connection() as conn:
            conn.execute(
                """
                UPDATE substrato_outbox_events
                SET status = 'pending',
                    attempts = attempts + 1,
                    available_at = ?,
                    last_error = ?
                WHERE event_id = ?
                """,
                (retry_at.isoformat(), error, event_id),
            )

    def pending_count(self) -> int:
        with self._connection() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS count FROM substrato_outbox_events WHERE status = 'pending'"
            ).fetchone()
        return int(row["count"])

    def replay(
        self,
        publisher: Callable[[EventEnvelope], None],
        *,
        batch_size: int = 100,
        retry_after_seconds: int = 30,
    ) -> OutboxReplayResult:
        delivered = 0
        failed = 0

        for record in self.fetch_pending(limit=batch_size):
            try:
                publisher(record.event)
            except Exception as exc:
                failed += 1
                self.mark_failed(
                    event_id=record.event.event_id,
                    error=str(exc),
                    retry_after_seconds=retry_after_seconds,
                )
            else:
                delivered += 1
                self.mark_delivered(record.event.event_id)

        return OutboxReplayResult(delivered=delivered, failed=failed, remaining=self.pending_count())

    def _connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_outbox_events (
                    event_id TEXT PRIMARY KEY,
                    event_name TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    tenant_id TEXT NULL,
                    source TEXT NOT NULL,
                    occurred_at TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    attempts INTEGER NOT NULL DEFAULT 0,
                    available_at TEXT NOT NULL,
                    last_error TEXT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_outbox_pending
                    ON substrato_outbox_events(status, available_at)
                """
            )

    def _row_to_record(self, row: sqlite3.Row) -> OutboxEventRecord:
        event = EventEnvelope(
            event_id=row["event_id"],
            name=row["event_name"],
            payload=json.loads(row["payload_json"]),
            tenant_id=row["tenant_id"],
            source=row["source"],
            occurred_at=datetime.fromisoformat(row["occurred_at"]),
        )
        return OutboxEventRecord(
            event=event,
            attempts=int(row["attempts"]),
            available_at=datetime.fromisoformat(row["available_at"]),
            last_error=row["last_error"],
        )
