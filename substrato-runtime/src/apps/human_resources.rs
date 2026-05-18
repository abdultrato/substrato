use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.human_resources",
        "human_resources",
        "1.0.0",
        &["apps.identity", "apps.tenants"],
        &[
            "human.resources.command.received",
            "human.resources.sync.requested",
        ],
        &[
            "human.resources.entity.changed",
            "human.resources.cache.invalidated",
        ],
        900,
        2000,
    )
}
