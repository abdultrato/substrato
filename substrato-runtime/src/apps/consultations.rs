use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.consultations",
        "consultations",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.clinical"],
        &[
            "consultations.command.received",
            "consultations.sync.requested",
        ],
        &[
            "consultations.entity.changed",
            "consultations.cache.invalidated",
        ],
        240,
        2600,
    )
}
