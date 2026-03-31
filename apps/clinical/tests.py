"""Testes mínimos de associação de tenant em paciente."""

from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant


def test_patient_saves_with_tenant(db):
    """Paciente deve salvar com tenant associado."""
    tenant = Tenant.objects.create(identifier="tn-inline", name="Tenant Inline")
    pac = Patient.objects.create(
        tenant=tenant,
        name="Paciente Inline",
        gender="Masculino",
        address_street="Rua B",
    )
    assert pac.pk
    assert pac.tenant == tenant
