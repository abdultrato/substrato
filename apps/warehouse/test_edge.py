from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from apps.warehouse.edge.conflicts.resolution import VersionedValue, resolve_versioned_conflict
from apps.warehouse.edge.local_cache.contracts import InMemoryLocalWarehouseCache
from apps.warehouse.edge.synchronization.package import SynchronizationEvent, SynchronizationPackage


def test_synchronization_package_requires_source_and_deduplicates_events():
    event = SynchronizationEvent(
        aggregate_id="SKU-001",
        event_type="warehouse.stock.adjusted",
        payload={"quantity": "2"},
        idempotency_key="evt-1",
    )

    package = SynchronizationPackage(source="edge-pemba", events=(event, event))

    assert package.event_count == 1
    assert package.to_payload()["events"][0]["idempotency_key"] == "evt-1"


def test_synchronization_package_accepts_dictionary_events_for_transport_boundaries():
    package = SynchronizationPackage(
        source="edge-pemba",
        events=(
            {
                "aggregate_id": "SKU-001",
                "event_type": "warehouse.stock.adjusted",
                "payload": {"quantity": "2"},
                "idempotency_key": "evt-1",
            },
        ),
    )

    assert package.events[0].aggregate_id == "SKU-001"
    assert package.to_payload()["event_count"] == 1


def test_synchronization_package_rejects_invalid_identity():
    with pytest.raises(ValueError):
        SynchronizationPackage(source="")

    with pytest.raises(ValueError):
        SynchronizationEvent(aggregate_id="", event_type="warehouse.stock.adjusted")


def test_versioned_conflict_resolution_prefers_version_then_timestamp_then_priority():
    now = datetime(2026, 5, 26, tzinfo=UTC)
    local = VersionedValue(value="local", version=1, updated_at=now, source_priority=1)
    remote_newer_version = VersionedValue(value="remote-version", version=2, updated_at=now - timedelta(days=1))
    remote_newer_time = VersionedValue(value="remote-time", version=1, updated_at=now + timedelta(seconds=1))
    remote_priority = VersionedValue(value="remote-priority", version=1, updated_at=now, source_priority=2)

    assert resolve_versioned_conflict(local, remote_newer_version).value == "remote-version"
    assert resolve_versioned_conflict(local, remote_newer_time).value == "remote-time"
    assert resolve_versioned_conflict(local, remote_priority).value == "remote-priority"
    assert resolve_versioned_conflict(local, VersionedValue(value="same", version=1, updated_at=now, source_priority=1)) is local


def test_in_memory_local_cache_supports_offline_read_write_delete_cycle():
    cache = InMemoryLocalWarehouseCache()

    cache.set("stock:SKU-001", {"quantity": "4"})
    assert cache.get("stock:SKU-001") == {"quantity": "4"}

    cache.delete("stock:SKU-001")
    assert cache.get("stock:SKU-001") is None
