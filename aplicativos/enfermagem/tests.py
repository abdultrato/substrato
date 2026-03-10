from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.enfermagem.modelos.procedimento import Procedimento
from aplicativos.enfermagem.modelos.procedimento_material import ProcedimentoMaterial
from aplicativos.farmacia.models.categoria_produto import CategoriaProduto
from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.produto import Produto
from aplicativos.inquilinos.modelos.inquilino import Inquilino


class ProcedimentoMaterialLoteAutomaticoTests(TestCase):
    def _criar_inquilino(self):
        return Inquilino.objects.create(
            identificador="inq-enfermagem-lote-auto",
            nome="Tenant Enfermagem",
        )

    def _criar_paciente(self, inquilino):
        return Paciente.objects.create(
            inquilino=inquilino,
            nome="Paciente Teste",
            morada="Rua Enfermagem",
            contacto="840000000",
        )

    def _criar_produto(self, inquilino):
        categoria = CategoriaProduto.objects.create(
            inquilino=inquilino,
            nome="Materiais",
        )
        return Produto.objects.create(
            inquilino=inquilino,
            nome="Gaze Estéril",
            categoria=categoria,
            preco_venda=Decimal("10.00"),
            estoque_minimo=1,
        )

    def _criar_procedimento(self, inquilino, paciente):
        return Procedimento.objects.create(
            inquilino=inquilino,
            paciente=paciente,
            observacoes="Teste de auto lote",
        )

    def test_define_lote_automaticamente_ignorando_vencido(self):
        inquilino = self._criar_inquilino()
        paciente = self._criar_paciente(inquilino)
        procedimento = self._criar_procedimento(inquilino, paciente)
        produto = self._criar_produto(inquilino)

        Lote.objects.create(
            inquilino=inquilino,
            produto=produto,
            numero_lote="VENCIDO-1",
            validade=timezone.localdate() - timedelta(days=1),
            quantidade_inicial=50,
        )
        lote_valido = Lote.objects.create(
            inquilino=inquilino,
            produto=produto,
            numero_lote="VALIDO-1",
            validade=timezone.localdate() + timedelta(days=30),
            quantidade_inicial=50,
        )

        material = ProcedimentoMaterial.objects.create(
            inquilino=inquilino,
            procedimento=procedimento,
            produto=produto,
            quantidade=5,
            custo_unitario=Decimal("5.00"),
        )

        self.assertEqual(material.lote_id, lote_valido.id)
        self.assertFalse(material.lote.vencido)
        self.assertIsNotNone(material.movimento_estoque_id)

    def test_falha_quando_nao_ha_lote_valido_com_saldo(self):
        inquilino = self._criar_inquilino()
        paciente = self._criar_paciente(inquilino)
        procedimento = self._criar_procedimento(inquilino, paciente)
        produto = self._criar_produto(inquilino)

        Lote.objects.create(
            inquilino=inquilino,
            produto=produto,
            numero_lote="VENCIDO-2",
            validade=timezone.localdate() - timedelta(days=3),
            quantidade_inicial=100,
        )

        with self.assertRaises(ValidationError):
            ProcedimentoMaterial.objects.create(
                inquilino=inquilino,
                procedimento=procedimento,
                produto=produto,
                quantidade=2,
                custo_unitario=Decimal("4.00"),
            )
