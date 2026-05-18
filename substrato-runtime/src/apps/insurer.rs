use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.insurer",
        "insurer",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.billing", "apps.clinical"],
        &[
            "insurer.command.received",
            "insurer.sync.requested",
        ],
        &[
            "insurer.entity.changed",
            "insurer.cache.invalidated",
        ],
        300,
        2200,
    )
}
