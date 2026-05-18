use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.maternity",
        "maternity",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.clinical"],
        &[
            "maternity.command.received",
            "maternity.sync.requested",
        ],
        &[
            "maternity.entity.changed",
            "maternity.cache.invalidated",
        ],
        240,
        2200,
    )
}
