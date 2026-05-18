use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.monitoring",
        "monitoring",
        "1.0.0",
        &["apps.tenants"],
        &[
            "monitoring.command.received",
            "monitoring.sync.requested",
        ],
        &[
            "monitoring.entity.changed",
            "monitoring.cache.invalidated",
        ],
        120,
        5000,
    )
}
