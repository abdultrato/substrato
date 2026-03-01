"""
PDF Base Engine — Clinical Enterprise Grade

✔ Layout A5 profissional
✔ Header institucional em todas páginas
✔ QR Code verificável (topo direito)
✔ Assinaturas automáticas
✔ Compressão e otimização
✔ Fallback seguro para logo
✔ Pronto para produção hospitalar
"""

import io
import logging
import os
from datetime import datetime
from functools import lru_cache

import qrcode
from django.conf import settings
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A5
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle

logger = logging.getLogger("pdf.engine")

# =========================================================
# CONFIGURAÇÕES GERAIS
# =========================================================

PAGE_SIZE = A5
LOGO_PATH = os.path.join(settings.BASE_DIR, "static", "img", "logo.png")
ADD_FIM_PAGE = True
HEADER_VERTICAL_INSET = 0.5 * cm

# =========================================================
# FONTES (fallback seguro)
# =========================================================

try:
    pdfmetrics.registerFont(TTFont("TimesNewRoman", "times.ttf"))
    pdfmetrics.registerFont(TTFont("TimesNewRoman-Bold", "timesbd.ttf"))
    FONT = "TimesNewRoman"
    FONT_BOLD = "TimesNewRoman-Bold"
except Exception:
    FONT = "Helvetica"
    FONT_BOLD = "Helvetica-Bold"
    logger.warning("Times New Roman não disponível — usando Helvetica.")

# =========================================================
# UTILIDADES
# =========================================================


def bold(text: str) -> str:
    return f'<font name="{FONT_BOLD}">{text}</font>'


# =========================================================
# LOGO OTIMIZADO E SEGURO
# =========================================================


@lru_cache(maxsize=2)
def _safe_image_reader(path: str):
    if not path or not os.path.exists(path):
        logger.warning("Logo não encontrado: %s", path)
        return None

    try:
        with Image.open(path) as img:
            img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85, optimize=True)
            buf.seek(0)
            return ImageReader(buf)
    except Exception as err:
        logger.warning("Falha ao processar logo.", exc_info=err)
        return None


# =========================================================
# QR CODE VERIFICÁVEL
# =========================================================


@lru_cache(maxsize=128)
def gerar_qr_code(url: str):
    if not url:
        return None
    try:
        qr = qrcode.QRCode(
            box_size=3,
            border=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
        )
        qr.add_data(url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return ImageReader(buf)

    except Exception as err:
        logger.warning("Erro ao gerar QR Code.", exc_info=err)
        return None


# =========================================================
# TEXTO FINAL
# =========================================================


def append_fim(elements):
    if not ADD_FIM_PAGE or not isinstance(elements, list):
        return

    style = ParagraphStyle(
        "fim",
        fontName=FONT,
        fontSize=9,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#333333"),
    )

    elements.append(Spacer(1, 0.35 * cm))
    elements.append(Paragraph("FIM", style))


# =========================================================
# CANVAS COM NUMERAÇÃO + COMPRESSÃO
# =========================================================


class NumberedCanvas(rl_canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.setPageCompression(1)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        if not self._saved_page_states:
            return super().save()

        total = len(self._saved_page_states)
        now = datetime.now().strftime("%d/%m/%Y às %H:%M")

        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_footer(total, now)
            rl_canvas.Canvas.showPage(self)

        rl_canvas.Canvas.save(self)

    def _draw_footer(self, total_pages, now_str):
        page_w, _ = self._pagesize

        try:
            self.setFont(FONT, 7)
        except Exception:
            self.setFont("Helvetica", 7)

        footer = f"Relatório gerado automaticamente em {now_str}"
        self.drawRightString(
            page_w - 1 * cm,
            0.7 * cm,
            f"{footer} — Página {self._pageNumber} de {total_pages}",
        )


# =========================================================
# HEADER INSTITUCIONAL (IDENTIDADE PRESERVADA)
# =========================================================


def draw_header(canvas_obj, doc):
    canvas_obj.saveState()

    page_w, page_h = doc.pagesize

    left_margin = getattr(doc, "leftMargin", 1 * cm)
    right_margin = getattr(doc, "rightMargin", 1 * cm)
    top_margin = getattr(doc, "topMargin", 3.8 * cm)

    logo = _safe_image_reader(LOGO_PATH)

    logo_w, logo_h = 3.0 * cm, 2.5 * cm
    logo_x = left_margin
    logo_y = page_h - top_margin + 0.9 * cm - HEADER_VERTICAL_INSET

    if logo:
        canvas_obj.drawImage(
            logo,
            logo_x,
            logo_y,
            width=logo_w,
            height=logo_h,
            preserveAspectRatio=True,
            mask="auto",
        )
    else:
        canvas_obj.setFont(FONT, 9)
        canvas_obj.drawString(logo_x, logo_y + 1.2 * cm, "LOGO INDISPONÍVEL")

    text_x = logo_x + logo_w + 0.4 * cm
    text_top_y = logo_y + logo_h - 0.2 * cm

    canvas_obj.setFont(FONT_BOLD, 10)
    canvas_obj.drawString(text_x, text_top_y, "CLÍNICA DE DIAGNÓSTICOS E SAÚDE")

    canvas_obj.setFont(FONT, 8)
    canvas_obj.drawString(
        text_x, text_top_y - 0.65 * cm, "Laboratório de Análises Clínicas"
    )

    canvas_obj.setFont(FONT, 7)
    canvas_obj.drawString(
        text_x, text_top_y - 1.10 * cm, "Pemba - Cabo Delgado, Moçambique"
    )

    canvas_obj.drawString(
        text_x,
        text_top_y - 1.45 * cm,
        "Tel: +258 84 777 8476 | Email: abdultrato@anabiolink.mz",
    )

    # QR Code topo direito
    if hasattr(doc, "qr_url") and doc.qr_url:
        qr = gerar_qr_code(doc.qr_url)
        if qr:
            qr_size = 2.2 * cm
            qr_x = page_w - right_margin - qr_size
            qr_y = logo_y + 0.2 * cm
            canvas_obj.drawImage(qr, qr_x, qr_y, qr_size, qr_size)

    # linha inferior
    y_line = logo_y - 0.15 * cm
    canvas_obj.setStrokeColor(colors.darkblue)
    canvas_obj.setLineWidth(1)
    canvas_obj.line(left_margin, y_line, page_w - right_margin, y_line)

    canvas_obj.restoreState()


# =========================================================
# ASSINATURAS
# =========================================================


def draw_signatures(canvas_obj, doc, usuario=None):
    canvas_obj.saveState()

    page_w, _ = doc.pagesize
    left_margin = getattr(doc, "leftMargin", 1 * cm)
    right_margin = getattr(doc, "rightMargin", 1 * cm)
    bottom_margin = getattr(doc, "bottomMargin", 2 * cm)

    y = max(0.9 * cm, bottom_margin - 0.6 * cm)

    width_total = page_w - (left_margin + right_margin)
    gap = 1.2 * cm
    width_line = (width_total - gap) / 2

    x1 = left_margin
    x2 = left_margin + width_line + gap

    canvas_obj.setStrokeColor(colors.darkblue)
    canvas_obj.line(x1, y, x1 + width_line, y)
    canvas_obj.line(x2, y, x2 + width_line, y)

    nome = identidade_usuario_institucional(usuario)

    canvas_obj.setFont(FONT, 8)
    canvas_obj.drawCentredString(x1 + width_line / 2, y - 10, f"Assinatura de {nome}")
    canvas_obj.drawCentredString(x2 + width_line / 2, y - 10, "Assinatura do Paciente/Responsável")

    canvas_obj.restoreState()


# =========================================================
# HOOK PADRÃO PARA TODAS AS PÁGINAS
# =========================================================


def on_page(canvas_obj, doc, usuario=None):
    draw_header(canvas_obj, doc)
    draw_signatures(canvas_obj, doc, usuario)


def draw_line_full_width(canvas_obj, doc):
    page_w, _ = doc.pagesize
    left_margin = getattr(doc, "leftMargin", 1 * cm)
    right_margin = getattr(doc, "rightMargin", 1 * cm)
    y_line = getattr(doc, "bottomMargin", 2 * cm) + 0.15 * cm

    canvas_obj.saveState()
    canvas_obj.setStrokeColor(colors.lightgrey)
    canvas_obj.setLineWidth(0.3)
    canvas_obj.line(left_margin, y_line, page_w - right_margin, y_line)
    canvas_obj.restoreState()


# =========================================================
# UTILIDADES PARA TABELAS
# =========================================================

bold_style = ParagraphStyle("Bold", fontName=FONT_BOLD, fontSize=8, alignment=TA_LEFT)
cell_style = ParagraphStyle("Cell", fontName=FONT, fontSize=8, alignment=TA_LEFT)


def cell_paragraph(text, is_bold=False):
    style = bold_style if is_bold else cell_style
    return Paragraph("" if text is None else str(text), style)


def nome_usuario(usuario):
    if not usuario:
        return "Sem usuário"

    full_name_fn = getattr(usuario, "get_full_name", None)
    if callable(full_name_fn):
        full_name = (full_name_fn() or "").strip()
        if full_name:
            return full_name

    for attr in ("nome", "username", "email"):
        valor = getattr(usuario, attr, None)
        if valor:
            return str(valor)

    return "Sem usuário"


def grupos_usuario(usuario):
    if not usuario:
        return "Sem Grupo"

    groups = getattr(usuario, "groups", None)
    if groups is None:
        return "Sem Grupo"

    nomes = []
    try:
        if hasattr(groups, "all"):
            nomes = [g.name for g in groups.all() if getattr(g, "name", None)]
        elif isinstance(groups, (list, tuple, set)):
            for g in groups:
                if isinstance(g, str):
                    nomes.append(g)
                else:
                    nome = getattr(g, "name", None)
                    if nome:
                        nomes.append(nome)
    except Exception:
        nomes = []

    return ", ".join(nomes) if nomes else "Sem Grupo"


def identidade_usuario_institucional(usuario):
    return f"Téc. de Laboratório | {grupos_usuario(usuario)} | {nome_usuario(usuario)}"


def estilo_titulo_documento(name="HeadingDoc"):
    return ParagraphStyle(
        name,
        fontName=FONT_BOLD,
        fontSize=11,
        leading=14,
        textColor=colors.darkblue,
    )


def estilo_secao_documento(name="SectionDoc"):
    return ParagraphStyle(
        name,
        fontName=FONT_BOLD,
        fontSize=9,
        textColor=colors.darkblue,
    )


def estilo_info_esquerda(name="InfoLeftDoc"):
    return ParagraphStyle(
        name,
        fontName=FONT,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#333333"),
    )


def estilo_info_direita(name="InfoRightDoc"):
    return ParagraphStyle(
        name,
        fontName=FONT,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#333333"),
        alignment=TA_RIGHT,
    )


def montar_bloco_identificacao(usable_width, left_lines, right_lines):
    style_left = estilo_info_esquerda("DocLeft")
    style_right = estilo_info_direita("DocRight")

    left_para = Paragraph("<br/>".join(left_lines), style_left)
    right_para = Paragraph("<br/>".join(right_lines), style_right)

    table = Table(
        [[left_para, right_para]],
        colWidths=[usable_width * 0.62, usable_width * 0.38],
    )
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 2),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return table
