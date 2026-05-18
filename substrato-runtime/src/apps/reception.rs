use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.reception",
        "reception",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.clinical"],
        &[
            "reception.command.received",
            "reception.sync.requested",
        ],
        &[
            "reception.entity.changed",
            "reception.cache.invalidated",
        ],
        180,
        3500,
    )
}
