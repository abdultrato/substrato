from django.core.exceptions import ValidationError
from django.test import TestCase

from aplicativos.inquilinos.modelos.inquilino import Inquilino


class InquilinosDadosIncompletosTests(TestCase):
    def test_inquilino_com_apenas_nome_falha_na_validacao(self):
        inquilino = Inquilino(nome="Tenant sem slug")

        with self.assertRaises(ValidationError):
            inquilino.full_clean()

    def test_inquilino_completo_salva_com_sucesso(self):
        inquilino = Inquilino(
            identificador="tenant-ok",
            nome="Tenant Completo",
        )

        inquilino.full_clean()
        inquilino.save()

        self.assertIsNotNone(inquilino.pk)
