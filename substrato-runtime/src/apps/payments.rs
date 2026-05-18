use crate::module::ModuleDescriptor;

pub fn descriptor() -> ModuleDescriptor {
    ModuleDescriptor::new(
        "apps.payments",
        "payments",
        "1.0.0",
        &["apps.identity", "apps.tenants", "apps.accounting"],
        &[
            "payments.command.received",
            "payments.sync.requested",
        ],
        &[
            "payments.entity.changed",
            "payments.cache.invalidated",
        ],
        300,
        3000,
    )
}
