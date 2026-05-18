use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.medical_records",
        "medical_records",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.clinical"],
        &[
            "medical.records.command.received",
            "medical.records.sync.requested",
        ],
        &[
            "medical.records.entity.changed",
            "medical.records.cache.invalidated",
        ],
        360,
        2600,
    )
}
