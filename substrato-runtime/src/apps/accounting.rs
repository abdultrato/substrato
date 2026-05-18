use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.accounting",
        "accounting",
        "1.0.0",
        &["apps.identity", "apps.tenants"],
        &[
            "accounting.command.received",
            "accounting.sync.requested",
        ],
        &[
            "accounting.entity.changed",
            "accounting.cache.invalidated",
        ],
        900,
        2600,
    )
}
