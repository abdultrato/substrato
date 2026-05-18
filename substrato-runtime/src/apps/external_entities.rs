use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.external_entities",
        "external_entities",
        "1.0.0",
        &["apps.identity", "apps.tenants"],
        &[
            "external.entities.command.received",
            "external.entities.sync.requested",
        ],
        &[
            "external.entities.entity.changed",
            "external.entities.cache.invalidated",
        ],
        600,
        2000,
    )
}
