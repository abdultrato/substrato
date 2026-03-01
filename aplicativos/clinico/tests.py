from django.core.exceptions import ValidationError
from django.test import TestCase

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.inquilinos.modelos.inquilino import Inquilino


class ClinicoDadosIncompletosTests(TestCase):
    def _criar_inquilino(self):
        return Inquilino.objects.create(
            identificador="inq-clinico",
            nome="Tenant Clinico",
        )

    def test_paciente_com_apenas_nome_falha_na_validacao(self):
        paciente = Paciente(nome="Jose")

        with self.assertRaises(ValidationError):
            paciente.full_clean()

    def test_paciente_completo_salva_com_sucesso(self):
        inquilino = self._criar_inquilino()
        paciente = Paciente(
            inquilino=inquilino,
            nome="Joao da Silva",
            morada="Rua Principal",
            contacto="841234567",
        )

        paciente.full_clean()
        paciente.save()

        self.assertIsNotNone(paciente.pk)
