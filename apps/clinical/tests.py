from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant


def test_patient_saves_with_tenant(db):
    tenant = Tenant.objects.create(identificador="tn-inline", nome="Tenant Inline")
    pac = Patient.objects.create(
        inquilino=tenant,
        nome="Paciente Inline",
        genero="Masculino",
        endereco_rua="Rua B",
    )
    assert pac.pk
    assert pac.inquilino == tenant
