pub mod accounting;
pub mod audit_activities;
pub mod billing;
pub mod bloodbank;
pub mod clinical;
pub mod consultations;
pub mod equipment;
pub mod equipment_integrations;
pub mod external_entities;
pub mod human_resources;
pub mod identity;
pub mod incidents;
pub mod inspections;
pub mod insurer;
pub mod maintenance;
pub mod maternity;
pub mod medical_records;
pub mod monitoring;
pub mod notifications;
pub mod nursing;
pub mod payments;
pub mod pharmacy;
pub mod reception;
pub mod surgery;
pub mod tenants;

use crate::module::ModuleDescriptor;

pub fn all_descriptors() -> Vec<ModuleDescriptor> {
    vec![
        accounting::descriptor(),
        audit_activities::descriptor(),
        billing::descriptor(),
        bloodbank::descriptor(),
        clinical::descriptor(),
        consultations::descriptor(),
        equipment::descriptor(),
        equipment_integrations::descriptor(),
        external_entities::descriptor(),
        human_resources::descriptor(),
        identity::descriptor(),
        incidents::descriptor(),
        inspections::descriptor(),
        insurer::descriptor(),
        maintenance::descriptor(),
        maternity::descriptor(),
        medical_records::descriptor(),
        monitoring::descriptor(),
        notifications::descriptor(),
        nursing::descriptor(),
        payments::descriptor(),
        pharmacy::descriptor(),
        reception::descriptor(),
        surgery::descriptor(),
        tenants::descriptor(),
    ]
}
