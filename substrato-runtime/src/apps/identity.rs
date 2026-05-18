use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.identity",
        "identity",
        "1.0.0",
        &["apps.tenants"],
        &[
            "identity.command.received",
            "identity.sync.requested",
        ],
        &[
            "identity.entity.changed",
            "identity.cache.invalidated",
        ],
        900,
        1800,
    )
}
