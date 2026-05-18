use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.clinical",
        "clinical",
        "1.0.0",
        &["apps.identity", "apps.tenants"],
        &[
            "clinical.command.received",
            "clinical.sync.requested",
        ],
        &[
            "clinical.entity.changed",
            "clinical.cache.invalidated",
        ],
        240,
        5000,
    )
}
