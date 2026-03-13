from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.inquilinos.modelos.inquilino import Inquilino


def test_paciente_salva_com_inquilino(db):
    tenant = Inquilino.objects.create(identificador="tn-inline", nome="Tenant Inline")
    pac = Paciente.objects.create(
        inquilino=tenant,
        nome="Paciente Inline",
        genero="Masculino",
        morada={"rua": "Rua B"},
    )
    assert pac.pk
    assert pac.inquilino == tenant
