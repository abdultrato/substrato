"""Observability and monitoring for AI operations."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class OperationMetrics:
    """Metrics for an operation."""

    operation_name: str
    start_time: float = field(default_factory=time.time)
    end_time: float | None = None
    duration_ms: float | None = None
    status: str = "pending"  # pending, success, failed, timeout
    error: str | None = None
    retry_count: int = 0
    circuit_breaker_state: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def finish(self, status: str = "success", error: str | None = None) -> None:
        """Mark operation as finished."""
        self.end_time = time.time()
        self.duration_ms = (self.end_time - self.start_time) * 1000
        self.status = status
        self.error = error

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "operation_name": self.operation_name,
            "start_time": datetime.fromtimestamp(self.start_time).isoformat(),
            "duration_ms": f"{self.duration_ms:.2f}" if self.duration_ms else None,
            "status": self.status,
            "error": self.error,
            "retry_count": self.retry_count,
            "circuit_breaker_state": self.circuit_breaker_state,
            "metadata": self.metadata,
        }


class AiObservabilityCollector:
    """Collects metrics for AI operations."""

    def __init__(self, retention_hours: int = 24) -> None:
        self.retention_hours = retention_hours
        self._metrics: list[OperationMetrics] = []
        self._last_cleanup = time.time()

    def record_operation(
        self,
        operation_name: str,
        status: str = "success",
        duration_ms: float | None = None,
        error: str | None = None,
        retry_count: int = 0,
        circuit_breaker_state: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> OperationMetrics:
        """Record an operation's metrics."""
        start_time = time.time()
        if duration_ms:
            start_time = start_time - (duration_ms / 1000)

        metrics = OperationMetrics(
            operation_name=operation_name,
            start_time=start_time,
            status=status,
            error=error,
            retry_count=retry_count,
            circuit_breaker_state=circuit_breaker_state,
            metadata=metadata or {},
        )

        if duration_ms:
            metrics.end_time = time.time()
            metrics.duration_ms = duration_ms

        self._metrics.append(metrics)
        self._cleanup_old_metrics()

        return metrics

    def get_metrics(
        self,
        operation_name: str | None = None,
        last_minutes: int = 60,
    ) -> list[OperationMetrics]:
        """Get metrics for operations."""
        cutoff_time = time.time() - (last_minutes * 60)

        metrics = [m for m in self._metrics if m.start_time >= cutoff_time]

        if operation_name:
            metrics = [m for m in metrics if m.operation_name == operation_name]

        return metrics

    def get_stats(
        self,
        operation_name: str | None = None,
        last_minutes: int = 60,
    ) -> dict[str, Any]:
        """Get aggregated statistics."""
        metrics = self.get_metrics(operation_name, last_minutes)

        if not metrics:
            return {"total": 0, "operations": []}

        successful = sum(1 for m in metrics if m.status == "success")
        failed = sum(1 for m in metrics if m.status == "failed")
        total_duration = sum(m.duration_ms for m in metrics if m.duration_ms)
        avg_duration = total_duration / len(metrics) if metrics else 0

        stats = {
            "total": len(metrics),
            "successful": successful,
            "failed": failed,
            "success_rate": f"{(successful / len(metrics) * 100):.1f}%",
            "avg_duration_ms": f"{avg_duration:.2f}",
            "total_duration_ms": f"{total_duration:.2f}",
            "last_minutes": last_minutes,
        }

        if operation_name:
            errors = [m.error for m in metrics if m.error]
            if errors:
                from collections import Counter

                error_counts = Counter(errors)
                stats["top_errors"] = dict(error_counts.most_common(5))

            retry_counts = [m.retry_count for m in metrics if m.retry_count > 0]
            if retry_counts:
                stats["avg_retries"] = f"{sum(retry_counts) / len(retry_counts):.2f}"

        return stats

    def _cleanup_old_metrics(self) -> None:
        """Remove metrics older than retention period."""
        now = time.time()
        if now - self._last_cleanup < 300:  # Cleanup every 5 minutes
            return

        cutoff_time = now - (self.retention_hours * 3600)
        old_count = len(self._metrics)
        self._metrics = [m for m in self._metrics if m.start_time >= cutoff_time]
        removed = old_count - len(self._metrics)

        if removed > 0:
            logger.debug(f"Observability cleanup: removed {removed} old metrics")

        self._last_cleanup = now


# Global collector instance
observability_collector = AiObservabilityCollector()


def record_operation(
    operation_name: str,
    *,
    status: str = "success",
    error: str | None = None,
    retry_count: int = 0,
    metadata: dict[str, Any] | None = None,
):
    """Context manager for recording operations."""

    class OperationRecorder:
        def __init__(self):
            self.start_time = time.time()
            self.metrics = None

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_val, exc_tb):
            duration_ms = (time.time() - self.start_time) * 1000
            final_status = status if not exc_type else "failed"
            final_error = str(exc_val) if exc_val else error

            self.metrics = observability_collector.record_operation(
                operation_name,
                status=final_status,
                duration_ms=duration_ms,
                error=final_error,
                retry_count=retry_count,
                metadata=metadata,
            )

            return False  # Don't suppress exceptions

    return OperationRecorder()
