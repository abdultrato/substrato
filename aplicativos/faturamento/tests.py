from decimal import Decimal
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.enfermagem.modelos.procedimento import Procedimento
from aplicativos.enfermagem.modelos.procedimento_item import ProcedimentoItem
from aplicativos.enfermagem.modelos.procedimento_material import ProcedimentoMaterial
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.faturamento.modelos.fatura_itens import FaturaItem
from aplicativos.farmacia.models.categoria_produto import CategoriaProduto
from aplicativos.farmacia.models.item_venda import ItemVenda
from aplicativos.farmacia.models.lote import Lote
from aplicativos.farmacia.models.produto import Produto
from aplicativos.farmacia.models.venda import Venda
from aplicativos.inquilinos.modelos.inquilino import Inquilino


class FaturamentoDadosIncompletosTests(TestCase):
    def _criar_inquilino(self, sufixo=""):
        return Inquilino.objects.create(
            identificador=f"inq-faturamento{sufixo}",
            nome="Tenant Faturamento",
        )

    def _criar_paciente(self, inquilino):
        return Paciente.objects.create(
            inquilino=inquilino,
            nome="Joao da Silva",
            morada="Rua 1",
            contacto="841234567",
        )

    def _criar_requisicao(self, inquilino, paciente):
        return RequisicaoAnalise.objects.create(
            inquilino=inquilino,
            paciente=paciente,
        )

    def _criar_produto_com_lote(self, inquilino, sufixo):
        categoria = CategoriaProduto.objects.create(
            inquilino=inquilino,
            nome=f"Categoria {sufixo}",
        )
        produto = Produto.objects.create(
            inquilino=inquilino,
            nome=f"Produto {sufixo}",
            categoria=categoria,
            preco_venda=Decimal("100.00"),
            estoque_minimo=1,
        )
        lote = Lote.objects.create(
            inquilino=inquilino,
            produto=produto,
            numero_lote=f"L{sufixo}",
            validade=timezone.localdate() + timedelta(days=365),
            quantidade_inicial=100,
        )
        return produto, lote

    def test_fatura_sem_referencia_falha_na_validacao(self):
        inquilino = self._criar_inquilino("-incompleta")
        paciente = self._criar_paciente(inquilino)
        fatura = Fatura(
            inquilino=inquilino,
            origem=Fatura.Origem.FARMACIA,
            paciente=paciente,
        )

        with self.assertRaises(ValidationError):
            fatura.full_clean()

    def test_fatura_clinica_completa_salva_com_sucesso(self):
        inquilino = self._criar_inquilino("-clinico")
        paciente = self._criar_paciente(inquilino)
        requisicao = self._criar_requisicao(inquilino, paciente)

        fatura = Fatura(
            inquilino=inquilino,
            origem=Fatura.Origem.CLINICO,
            requisicao=requisicao,
        )

        fatura.full_clean()
        fatura.save()

        self.assertIsNotNone(fatura.pk)
        self.assertEqual(fatura.paciente_id, paciente.id)

    def test_sincroniza_itens_de_venda_da_farmacia(self):
        inquilino = self._criar_inquilino("-farmacia")
        produto, _ = self._criar_produto_com_lote(inquilino, "FAR")
        venda = Venda.objects.create(inquilino=inquilino)
        item_venda = ItemVenda.objects.create(
            inquilino=inquilino,
            venda=venda,
            produto=produto,
            quantidade=2,
            preco_unitario=Decimal("150.00"),
        )

        fatura = Fatura.objects.create(
            inquilino=inquilino,
            origem=Fatura.Origem.FARMACIA,
            venda=venda,
        )

        fatura.sincronizar_itens_da_origem()

        item = fatura.itens.get(deletado=False)
        self.assertEqual(item.tipo_item, item.TipoItem.ITEM_VENDA)
        self.assertEqual(item.item_venda_id, item_venda.id)
        self.assertEqual(item.quantidade, Decimal("2"))
        self.assertEqual(item.preco_unitario, Decimal("150.00"))
        self.assertEqual(fatura.subtotal, Decimal("300.00"))

    def test_sincroniza_itens_de_procedimento_enfermagem(self):
        inquilino = self._criar_inquilino("-enfermagem")
        paciente = self._criar_paciente(inquilino)
        produto, lote = self._criar_produto_com_lote(inquilino, "ENF")

        procedimento = Procedimento.objects.create(
            inquilino=inquilino,
            paciente=paciente,
            observacoes="Teste",
        )
        procedimento_item = ProcedimentoItem.objects.create(
            inquilino=inquilino,
            procedimento=procedimento,
            descricao="Curativo",
            quantidade=1,
            preco_unitario=Decimal("500.00"),
            realizado=True,
        )
        procedimento_material = ProcedimentoMaterial.objects.create(
            inquilino=inquilino,
            procedimento=procedimento,
            procedimento_item=procedimento_item,
            produto=produto,
            lote=lote,
            quantidade=2,
            custo_unitario=Decimal("20.00"),
        )

        fatura = Fatura.objects.create(
            inquilino=inquilino,
            origem=Fatura.Origem.ENFERMAGEM,
            procedimento=procedimento,
        )

        fatura.sincronizar_itens_da_origem()

        itens = list(fatura.itens.filter(deletado=False))
        tipos = {item.tipo_item for item in itens}
        self.assertEqual(
            tipos,
            {
                FaturaItem.TipoItem.PROCEDIMENTO_ITEM,
                FaturaItem.TipoItem.PROCEDIMENTO_MATERIAL,
            },
        )
        self.assertTrue(
            fatura.itens.filter(
                tipo_item=FaturaItem.TipoItem.PROCEDIMENTO_ITEM,
                procedimento_item=procedimento_item,
            ).exists()
        )
        self.assertTrue(
            fatura.itens.filter(
                tipo_item=FaturaItem.TipoItem.PROCEDIMENTO_MATERIAL,
                procedimento_material=procedimento_material,
            ).exists()
        )
