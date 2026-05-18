use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.nursing",
        "nursing",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.clinical", "apps.pharmacy"],
        &[
            "nursing.command.received",
            "nursing.sync.requested",
        ],
        &[
            "nursing.entity.changed",
            "nursing.cache.invalidated",
        ],
        240,
        2800,
    )
}
