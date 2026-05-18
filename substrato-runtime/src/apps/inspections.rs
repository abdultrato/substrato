use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.inspections",
        "inspections",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.monitoring"],
        &[
            "inspections.command.received",
            "inspections.sync.requested",
        ],
        &[
            "inspections.entity.changed",
            "inspections.cache.invalidated",
        ],
        180,
        1800,
    )
}
