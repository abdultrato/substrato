use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.billing",
        "billing",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.payments", "apps.accounting"],
        &[
            "billing.command.received",
            "billing.sync.requested",
        ],
        &[
            "billing.entity.changed",
            "billing.cache.invalidated",
        ],
        420,
        3200,
    )
}
