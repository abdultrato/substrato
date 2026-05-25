from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SubstratoOsIntegrationMap:
    event_bus: str = "events.bus.event_bus"
    tenant_context: str = "apps.tenants"
    billing: str = "apps.billing"
    audit: str = "apps.audit_activities"
    permissions: str = "security.permissions.rbac"
    observability: str = "observability.opentelemetry"


def get_substrato_os_integrations() -> SubstratoOsIntegrationMap:
    return SubstratoOsIntegrationMap()
