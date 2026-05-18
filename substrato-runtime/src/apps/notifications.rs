use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.notifications",
        "notifications",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.monitoring"],
        &[
            "notifications.command.received",
            "notifications.sync.requested",
        ],
        &[
            "notifications.entity.changed",
            "notifications.cache.invalidated",
        ],
        120,
        4000,
    )
}
