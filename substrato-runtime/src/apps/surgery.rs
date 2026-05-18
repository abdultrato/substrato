use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.surgery",
        "surgery",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.clinical"],
        &[
            "surgery.command.received",
            "surgery.sync.requested",
        ],
        &[
            "surgery.entity.changed",
            "surgery.cache.invalidated",
        ],
        240,
        2400,
    )
}
