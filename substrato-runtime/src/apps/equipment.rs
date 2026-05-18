use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.equipment",
        "equipment",
        "1.0.0",
        &["apps.identity", "apps.tenants"],
        &[
            "equipment.command.received",
            "equipment.sync.requested",
        ],
        &[
            "equipment.entity.changed",
            "equipment.cache.invalidated",
        ],
        420,
        1800,
    )
}
