from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from aplicativos.farmacia.models.produto import Produto, TipoProduto
from aplicativos.inquilinos.modelos.inquilino import Inquilino


class FarmaciaDadosIncompletosTests(TestCase):
    def _criar_inquilino(self):
        return Inquilino.objects.create(
            identificador="inq-farmacia",
            nome="Tenant Farmacia",
        )

    def test_produto_com_apenas_nome_falha_na_validacao(self):
        produto = Produto(nome="Paracetamol")

        with self.assertRaises(ValidationError):
            produto.full_clean()

    def test_produto_completo_salva_com_sucesso(self):
        inquilino = self._criar_inquilino()
        produto = Produto(
            inquilino=inquilino,
            nome="Paracetamol",
            tipo=TipoProduto.MEDICAMENTO,
            preco_venda=Decimal("15.00"),
        )

        produto.full_clean()
        produto.save()

        self.assertIsNotNone(produto.pk)
