use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.tenants",
        "tenants",
        "1.0.0",
        &[],
        &[
            "tenants.command.received",
            "tenants.sync.requested",
        ],
        &[
            "tenants.entity.changed",
            "tenants.cache.invalidated",
        ],
        1200,
        1200,
    )
}
