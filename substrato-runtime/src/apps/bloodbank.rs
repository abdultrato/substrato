use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.bloodbank",
        "bloodbank",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.clinical"],
        &[
            "bloodbank.command.received",
            "bloodbank.sync.requested",
        ],
        &[
            "bloodbank.entity.changed",
            "bloodbank.cache.invalidated",
        ],
        240,
        2400,
    )
}
