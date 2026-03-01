from django.core.exceptions import ValidationError
from django.test import TestCase

from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.seguradora.modelos.seguradora import Seguradora


class SeguradoraDadosIncompletosTests(TestCase):
    def _criar_inquilino(self):
        return Inquilino.objects.create(
            identificador="inq-seguradora",
            nome="Tenant Seguradora",
        )

    def test_seguradora_com_apenas_nome_falha(self):
        seguradora = Seguradora(nome="Vida Seguros")

        with self.assertRaises(ValidationError):
            seguradora.full_clean()

    def test_seguradora_completa_salva_com_sucesso(self):
        inquilino = self._criar_inquilino()
        seguradora = Seguradora(
            inquilino=inquilino,
            nome="Vida Seguros",
        )

        seguradora.full_clean()
        seguradora.save()

        self.assertIsNotNone(seguradora.pk)
