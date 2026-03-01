from datetime import datetime
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.core.exceptions import ValidationError
from django.http import Http404
from django.test import RequestFactory, SimpleTestCase
from reportlab.lib.pagesizes import A5
from reportlab.pdfgen import canvas

from tarefas.gerar_pdf.pdf_base import (
    NumberedCanvas,
    _safe_image_reader,
    append_fim,
    bold,
    cell_paragraph,
    draw_header,
    draw_line_full_width,
    draw_signatures,
    grupos_usuario,
    gerar_qr_code,
    identidade_usuario_institucional,
    nome_usuario,
    on_page,
)
from tarefas.gerar_pdf.pdf_generator_fatura import gerar_pdf_fatura
from tarefas.gerar_pdf.pdf_generator_requisicao import gerar_pdf_requisicao
from tarefas.gerar_pdf.pdf_generator_resultado import gerar_pdf_resultados
from tarefas.gerar_pdf.strings import (
    capitalizar_nome,
    normalizar_texto,
    slugify_simples,
    somente_numeros,
)
from tarefas.gerar_pdf.validators import (
    apenas_numeros,
    validar_codigo,
    validar_percentual,
    validar_texto_minimo,
)
from tarefas.gerar_pdf.views import (
    RequisicaoPdf,
    ResultadoPdf,
    fatura_pdf,
    fatura_requisicao_pdf,
    pdf_requisicao,
    pdf_resultados,
)


class _FakeQuerySet(list):
    def all(self):
        return self

    def exists(self):
        return len(self) > 0

    def select_related(self, *args, **kwargs):
        return self

    def filter(self, **kwargs):
        if "validado" not in kwargs:
            return self
        esperado = kwargs["validado"]
        return _FakeQuerySet([item for item in self if getattr(item, "validado", None) == esperado])

    def prefetch_related(self, *args, **kwargs):
        return self

    def get(self, **kwargs):
        if not self:
            raise ValueError("nao encontrado")
        return self[0]


class PdfStringsValidatorsTests(SimpleTestCase):
    def test_strings_helpers(self):
        self.assertEqual(somente_numeros("(84) 123-4567"), "841234567")
        self.assertEqual(normalizar_texto("ação"), "acao")
        self.assertEqual(slugify_simples("Resultado Clínico 2026"), "resultado-clinico-2026")
        self.assertEqual(capitalizar_nome("joao da silva"), "Joao Da Silva")

    def test_validators_helpers(self):
        self.assertEqual(apenas_numeros("+258 84 123 4567"), "258841234567")
        self.assertEqual(validar_percentual(0), 0)
        self.assertEqual(validar_percentual(100), 100)
        self.assertEqual(validar_texto_minimo("abc"), "abc")
        self.assertEqual(validar_codigo(" ab-123 "), "AB-123")

        with self.assertRaises(ValidationError):
            validar_percentual(-1)
        with self.assertRaises(ValidationError):
            validar_percentual(101)
        with self.assertRaises(ValidationError):
            validar_texto_minimo("a")
        with self.assertRaises(ValidationError):
            validar_codigo("abc@123")


class PdfBaseTests(SimpleTestCase):
    def test_pdf_base_utils(self):
        self.assertIn("Teste", bold("Teste"))
        self.assertIsNone(_safe_image_reader(""))
        self.assertIsNotNone(gerar_qr_code("https://example.com/fatura/1"))
        self.assertIsNone(gerar_qr_code(""))
        self.assertIsNotNone(cell_paragraph("texto"))

    def test_identidade_usuario_institucional(self):
        user = SimpleNamespace(
            get_full_name=lambda: "Joao Silva",
            groups=[SimpleNamespace(name="analista"), SimpleNamespace(name="laboratorio")],
        )
        self.assertEqual(nome_usuario(user), "Joao Silva")
        self.assertEqual(grupos_usuario(user), "analista, laboratorio")
        self.assertEqual(
            identidade_usuario_institucional(user),
            "Téc. de Laboratório | analista, laboratorio | Joao Silva",
        )

    def test_identidade_usuario_sem_grupo_ou_nome(self):
        user = SimpleNamespace(username="jsilva")
        self.assertEqual(nome_usuario(user), "jsilva")
        self.assertEqual(grupos_usuario(user), "Sem Grupo")
        self.assertEqual(
            identidade_usuario_institucional(user),
            "Téc. de Laboratório | Sem Grupo | jsilva",
        )

    def test_append_fim(self):
        elements = []
        append_fim(elements)
        self.assertEqual(len(elements), 2)

    def test_drawing_functions(self):
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A5)
        doc = SimpleNamespace(
            pagesize=A5,
            leftMargin=28,
            rightMargin=28,
            topMargin=108,
            bottomMargin=56,
            qr_url="https://example.com/doc",
        )

        draw_header(c, doc)
        draw_signatures(c, doc)
        draw_line_full_width(c, doc)
        on_page(c, doc)
        c.showPage()
        c.save()

        pdf_bytes = buffer.getvalue()
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_numbered_canvas_build(self):
        buffer = BytesIO()
        c = NumberedCanvas(buffer, pagesize=A5)
        c.drawString(100, 750, "Pagina 1")
        c.showPage()
        c.drawString(100, 750, "Pagina 2")
        c.showPage()
        c.save()
        self.assertTrue(buffer.getvalue().startswith(b"%PDF"))


class PdfGeneratorTests(SimpleTestCase):
    def _paciente_incompleto(self):
        return SimpleNamespace(
            nome="Paciente Teste",
            idade=lambda: "—",
            genero=None,
            raca_origem=None,
            tipo_documento=None,
            numero_id=None,
            proveniencia=None,
            contacto=None,
            email=None,
        )

    def test_gerar_pdf_requisicao_com_dados_incompletos(self):
        exame = SimpleNamespace(id_custom="EXA0001", nome="Hemograma", metodo="Manual")
        requisicao = SimpleNamespace(
            id_custom="REQ0001",
            paciente=self._paciente_incompleto(),
            analista=None,
            criado_em=datetime(2026, 3, 1, 10, 30),
            exames=_FakeQuerySet([exame]),
        )

        pdf_bytes, filename = gerar_pdf_requisicao(requisicao)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertEqual(filename, "REQ0001_Paciente Teste.pdf")

    def test_gerar_pdf_resultados_com_modelo_atual(self):
        exame = SimpleNamespace(nome="Bioquimica", metodo="Automatizado")
        campo = SimpleNamespace(
            nome="Glicose",
            unidade="mg/dL",
            valor_minimo=70,
            valor_maximo=100,
            exame=exame,
        )
        resultado = SimpleNamespace(exame_campo=campo, resultado="95", validado=True)
        requisicao = SimpleNamespace(
            id_custom="REQ0002",
            paciente=self._paciente_incompleto(),
            analista=None,
            criado_em=datetime(2026, 3, 1, 11, 0),
            resultados=_FakeQuerySet([resultado]),
        )

        pdf_bytes, filename = gerar_pdf_resultados(requisicao, apenas_validados=True)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertEqual(filename, "REQ0002_Paciente Teste.pdf")

    def test_gerar_pdf_fatura_sem_itens(self):
        requisicao = SimpleNamespace(id_custom="REQ0003", analista=None, criado_em=datetime(2026, 3, 1, 12, 0))
        fatura = SimpleNamespace(
            id_custom="FAT0001",
            paciente=self._paciente_incompleto(),
            requisicao=requisicao,
            estado="RASC",
            subtotal=0,
            total=0,
            iva_valor=0,
            itens=_FakeQuerySet([]),
        )

        pdf_bytes, filename = gerar_pdf_fatura(fatura)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertEqual(filename, "FAT0001_Paciente Teste.pdf")


class PdfViewsTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @patch("tarefas.gerar_pdf.views.get_object_or_404")
    def test_requisicao_pdf_view_ok(self, get_obj):
        get_obj.return_value = SimpleNamespace(id=1, paciente=SimpleNamespace(nome="Paciente"))
        response = RequisicaoPdf().get(self.factory.get("/"), pk=1)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")

    @patch("tarefas.gerar_pdf.views.get_object_or_404", side_effect=Exception("erro"))
    def test_requisicao_pdf_view_erro(self, _):
        with self.assertRaises(Http404):
            RequisicaoPdf().get(self.factory.get("/"), pk=1)

    @patch("tarefas.gerar_pdf.views.get_object_or_404")
    def test_resultado_pdf_view_ok(self, get_obj):
        get_obj.return_value = SimpleNamespace(id=1, requisicao=SimpleNamespace(paciente=SimpleNamespace(nome="Paciente")))
        response = ResultadoPdf().get(self.factory.get("/"), pk=1)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")

    @patch("tarefas.gerar_pdf.views.gerar_pdf_requisicao", return_value=(b"%PDF-1.4", "req.pdf"))
    @patch("tarefas.gerar_pdf.views.get_object_or_404")
    def test_pdf_requisicao_ok(self, get_obj, _):
        get_obj.return_value = SimpleNamespace()
        response = pdf_requisicao(self.factory.get("/"), requisicao_id=1)
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment; filename=", response["Content-Disposition"])

    @patch("tarefas.gerar_pdf.views.get_object_or_404", side_effect=Exception("erro"))
    def test_pdf_requisicao_erro(self, _):
        with self.assertRaises(Http404):
            pdf_requisicao(self.factory.get("/"), requisicao_id=1)

    @patch("tarefas.gerar_pdf.views.gerar_pdf_resultados", return_value=(b"%PDF-1.4", "res.pdf"))
    @patch("tarefas.gerar_pdf.views.get_object_or_404")
    def test_pdf_resultados_ok(self, get_obj, _):
        get_obj.return_value = SimpleNamespace()
        response = pdf_resultados(self.factory.get("/"), requisicao_id=1)
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment; filename=", response["Content-Disposition"])

    @patch("tarefas.gerar_pdf.views.gerar_pdf_fatura", return_value=(b"%PDF-1.4", "fat.pdf"))
    @patch("tarefas.gerar_pdf.views.RequisicaoAnalise.objects")
    def test_fatura_requisicao_pdf_ok(self, req_objects, _):
        req_objects.select_related.return_value.prefetch_related.return_value.get.return_value = SimpleNamespace()
        response = fatura_requisicao_pdf.__wrapped__(self.factory.get("/"), id_custom="REQ1")
        self.assertEqual(response.status_code, 200)
        self.assertIn('inline; filename="fat.pdf"', response["Content-Disposition"])

    @patch("tarefas.gerar_pdf.views.RequisicaoAnalise.objects")
    def test_fatura_requisicao_pdf_erro_busca(self, req_objects):
        req_objects.select_related.return_value.prefetch_related.return_value.get.side_effect = Exception("erro")
        with self.assertRaises(Http404):
            fatura_requisicao_pdf.__wrapped__(self.factory.get("/"), id_custom="REQ1")

    @patch("tarefas.gerar_pdf.views.gerar_pdf_fatura", return_value=(b"%PDF-1.4", "fat.pdf"))
    @patch("tarefas.gerar_pdf.views.get_object_or_404")
    def test_fatura_pdf_ok(self, get_obj, _):
        fatura = SimpleNamespace(recalcular_totais=MagicMock())
        get_obj.return_value = fatura
        response = fatura_pdf.__wrapped__(self.factory.get("/"), fatura_id_custom="FAT1")
        self.assertEqual(response.status_code, 200)
        self.assertIn('inline; filename="fat.pdf"', response["Content-Disposition"])
        fatura.recalcular_totais.assert_called_once_with(save=True)

    @patch("tarefas.gerar_pdf.views.get_object_or_404", side_effect=Exception("erro"))
    def test_fatura_pdf_erro(self, _):
        with self.assertRaises(Http404):
            fatura_pdf.__wrapped__(self.factory.get("/"), fatura_id_custom="FAT1")
