use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.equipment_integrations",
        "equipment_integrations",
        "1.0.0",
        &["apps.equipment", "apps.identity", "apps.tenants"],
        &[
            "equipment.integrations.command.received",
            "equipment.integrations.sync.requested",
        ],
        &[
            "equipment.integrations.entity.changed",
            "equipment.integrations.cache.invalidated",
        ],
        180,
        2200,
    )
}
