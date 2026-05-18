use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.pharmacy",
        "pharmacy",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.external_entities"],
        &[
            "pharmacy.command.received",
            "pharmacy.sync.requested",
        ],
        &[
            "pharmacy.entity.changed",
            "pharmacy.cache.invalidated",
        ],
        180,
        3000,
    )
}
