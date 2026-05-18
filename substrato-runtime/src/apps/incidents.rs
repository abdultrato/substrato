use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.incidents",
        "incidents",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.monitoring"],
        &[
            "incidents.command.received",
            "incidents.sync.requested",
        ],
        &[
            "incidents.entity.changed",
            "incidents.cache.invalidated",
        ],
        180,
        2000,
    )
}
