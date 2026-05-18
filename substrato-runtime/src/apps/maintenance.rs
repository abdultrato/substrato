use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.maintenance",
        "maintenance",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.monitoring"],
        &[
            "maintenance.command.received",
            "maintenance.sync.requested",
        ],
        &[
            "maintenance.entity.changed",
            "maintenance.cache.invalidated",
        ],
        120,
        1500,
    )
}
