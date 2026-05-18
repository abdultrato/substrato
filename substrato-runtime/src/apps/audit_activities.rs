use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.audit_activities",
        "audit_activities",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.monitoring"],
        &[
            "audit.activities.command.received",
            "audit.activities.sync.requested",
        ],
        &[
            "audit.activities.entity.changed",
            "audit.activities.cache.invalidated",
        ],
        300,
        4000,
    )
}
