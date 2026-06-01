"""
PDF Base Engine — Clinical Enterprise Grade

✔ Layout A5 professional
✔ Header institucional em todas páginas
✔ QR Code verificável (topo direito)
✔ Assinaturas configuráveis por documento
✔ Compressão e otimização
✔ Fallback seguro para logo
✔ Pronto para produção hospitalar
"""

from functools import lru_cache
import io
import logging
import os
import secrets
import unicodedata

from django.conf import settings
from django.utils import timezone
from PIL import Image
import qrcode
from reportlab.graphics.barcode import code128
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A5
from reportlab.lib.pdfencrypt import StandardEncryption
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
PDF_MARGIN = 0.5 * cm
PDF_HEADER_TOP_MARGIN = 2.0 * cm
PDF_BOTTOM_MARGIN = 0.5 * cm
PDF_BODY_FONT_SIZE = 10
PDF_TITLE_FONT_SIZE = 11
PDF_BODY_LEADING = 12
PDF_TITLE_LEADING = 13

# =========================================================
# FONTES
# =========================================================


def _first_existing(paths: list[str]) -> str | None:
    for p in paths:
        if p and os.path.exists(p):
            return p
    return None


def _configure_fonts() -> tuple[str, str]:
    """
    Define as fontes padrão para TODOS os PDFs.

    Ordem:
    1) Helvetica (padrão solicitado e nativo do ReportLab)
    2) Arial (fallback quando Helvetica não estiver disponível)
    3) Helvetica builtin como fallback defensivo final
    """

    try:
        pdfmetrics.getFont("Helvetica")
        pdfmetrics.getFont("Helvetica-Bold")
        logger.info("PDF fontes: Helvetica ativada.")
        return "Helvetica", "Helvetica-Bold"
    except Exception as err:
        logger.warning("Helvetica indisponível. Tentando Arial.", exc_info=err)

    base_dir = getattr(settings, "BASE_DIR", os.getcwd())
    arial_regular = _first_existing(
        [
            os.path.join(base_dir, "static", "fonts", "arial.ttf"),
            os.path.join(base_dir, "static", "fonts", "Arial.ttf"),
            r"C:\Windows\Fonts\arial.ttf",
            "/usr/share/fonts/truetype/msttcorefonts/arial.ttf",
        ]
    )
    arial_bold = _first_existing(
        [
            os.path.join(base_dir, "static", "fonts", "arialbd.ttf"),
            os.path.join(base_dir, "static", "fonts", "Arial-Bold.ttf"),
            r"C:\Windows\Fonts\arialbd.ttf",
            "/usr/share/fonts/truetype/msttcorefonts/arialbd.ttf",
        ]
    )

    if arial_regular and arial_bold:
        try:
            pdfmetrics.registerFont(TTFont("Arial", arial_regular))
            pdfmetrics.registerFont(TTFont("Arial-Bold", arial_bold))
            logger.info("PDF fontes: Arial ativada como fallback.")
            return "Arial", "Arial-Bold"
        except Exception as err:
            logger.warning("Falha ao registar Arial. A usar Helvetica builtin.", exc_info=err)

    logger.warning("Arial indisponível — usando Helvetica builtin.")
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = _configure_fonts()


# =========================================================
# SEGURANÇA DO PDF (PERMISSÕES)
# =========================================================


def pdf_encryption() -> StandardEncryption:
    """
    Torna o PDF "não editável" na prática (a maioria dos leitores respeita).

    Nota:
    - Isto aplica permissões do PDF (encrypt + flags), não é uma garantia
      criptográfica contra adulteração por ferramentas avançadas.
    - O userPassword é vazio para o documento abrir sem pedir senha.
    - Um ownerPassword aleatório impede alteração fácil das permissões.
    """

    owner = secrets.token_urlsafe(32)
    return StandardEncryption(
        userPassword="",
        ownerPassword=owner,
        canPrint=1,
        canModify=0,
        canCopy=0,
        canAnnotate=0,
        strength=128,
    )


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
def generate_qr_code(url: str):
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
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#333333"),
    )

    elements.append(Spacer(1, 0.35 * cm))
    elements.append(Paragraph("Fim", style))


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
        now = timezone.localtime().strftime("%d/%m/%Y às %H:%M")

        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_footer(total, now)
            rl_canvas.Canvas.showPage(self)

        rl_canvas.Canvas.save(self)
        return None

    def _draw_footer(self, total_pages, now_str):
        page_w, _ = self._pagesize

        try:
            self.setFont(FONT, PDF_BODY_FONT_SIZE)
        except Exception:
            self.setFont("Helvetica", PDF_BODY_FONT_SIZE)

        footer = f"Gerado em {now_str} | Página {self._pageNumber}/{total_pages}"
        self.drawRightString(
            page_w - PDF_MARGIN,
            0.7 * cm,
            footer,
        )


# =========================================================
# CÓDIGO DE BARRAS (CODE128)
# =========================================================


def _sanitize_barcode(value: str) -> str:
    value = ("" if value is None else str(value)).strip()
    if not value:
        return ""
    # Remove acentos e limita a ASCII imprimível.
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.encode("ascii", "ignore").decode("ascii")
    return "".join(ch for ch in value if 32 <= ord(ch) <= 126)


def draw_barcode(canvas_obj, doc, x, y, max_width) -> None:
    value = getattr(doc, "barcode_value", None)
    payload = _sanitize_barcode(value)
    if not payload:
        return
    try:
        bar = code128.Code128(payload, barHeight=0.45 * cm, barWidth=0.35)
        bar.humanReadable = False

        scale_x = 1.0
        if max_width and getattr(bar, "width", 0) and bar.width > max_width:
            scale_x = max_width / bar.width

        canvas_obj.saveState()
        canvas_obj.translate(x, y)
        if scale_x != 1.0:
            canvas_obj.scale(scale_x, 1.0)
        bar.drawOn(canvas_obj, 0, 0)
        canvas_obj.restoreState()
    except Exception as err:
        logger.warning("Falha ao desenhar código de barras.", exc_info=err)


# =========================================================
# HEADER INSTITUCIONAL (IDENTIDADE PRESERVADA)
# =========================================================


def draw_header(canvas_obj, doc):
    canvas_obj.saveState()

    page_w, page_h = doc.pagesize

    left_margin = getattr(doc, "leftMargin", PDF_MARGIN)
    right_margin = getattr(doc, "rightMargin", PDF_MARGIN)
    top_margin = getattr(doc, "topMargin", PDF_HEADER_TOP_MARGIN)

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
        canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE)
        canvas_obj.drawString(logo_x, logo_y + 1.2 * cm, "LOGO INDISPONÍVEL")

    text_x = logo_x + logo_w + 0.4 * cm
    text_top_y = logo_y + logo_h - 0.2 * cm

    canvas_obj.setFont(FONT_BOLD, PDF_TITLE_FONT_SIZE)
    canvas_obj.drawString(text_x, text_top_y, "CLÍNICA DE DIAGNÓSTICOS E SAÚDE")

    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE)
    canvas_obj.drawString(text_x, text_top_y - 0.65 * cm, "Laboratório de Análises Clínicas")

    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE)
    canvas_obj.drawString(text_x, text_top_y - 1.10 * cm, "Pemba - Cabo Delgado, Moçambique")

    canvas_obj.drawString(
        text_x,
        text_top_y - 1.45 * cm,
        "Tel/WhatsApp: +258 84 777 8476 | Email: substratosys@gmail.com",
    )

    # linha inferior (limite do header)
    y_line = logo_y - 0.15 * cm

    # QR Code topo direito
    qr_x = None
    if hasattr(doc, "qr_url") and doc.qr_url:
        qr = generate_qr_code(doc.qr_url)
        if qr:
            qr_size = 2.2 * cm
            qr_x = page_w - right_margin - qr_size
            qr_y = logo_y + 0.2 * cm
            canvas_obj.drawImage(qr, qr_x, qr_y, qr_size, qr_size)

    # Código de barras (Code128) com dados essenciais do patient/documento
    if hasattr(doc, "barcode_value") and doc.barcode_value:
        right_limit = (qr_x - 0.2 * cm) if qr_x is not None else (page_w - right_margin)
        max_w = max(1 * cm, right_limit - text_x)
        draw_barcode(
            canvas_obj,
            doc,
            x=text_x,
            y=(y_line + 0.15 * cm),
            max_width=max_w,
        )

    canvas_obj.setStrokeColor(colors.darkblue)
    canvas_obj.setLineWidth(1)
    canvas_obj.line(left_margin, y_line, page_w - right_margin, y_line)

    canvas_obj.restoreState()


# =========================================================
# ASSINATURAS
# =========================================================


def draw_signatures(canvas_obj, doc, user=None):
    canvas_obj.saveState()

    page_w, _ = doc.pagesize
    left_margin = getattr(doc, "leftMargin", PDF_MARGIN)
    right_margin = getattr(doc, "rightMargin", PDF_MARGIN)
    bottom_margin = getattr(doc, "bottomMargin", PDF_BOTTOM_MARGIN)

    y = max(0.9 * cm, bottom_margin - 0.6 * cm)

    width_total = page_w - (left_margin + right_margin)
    gap = 1.2 * cm
    width_line = (width_total - gap) / 2

    x1 = left_margin
    x2 = left_margin + width_line + gap

    canvas_obj.setStrokeColor(colors.darkblue)
    canvas_obj.line(x1, y, x1 + width_line, y)
    canvas_obj.line(x2, y, x2 + width_line, y)

    name = institutional_user_identity(user)

    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE)
    canvas_obj.drawCentredString(x1 + width_line / 2, y - 9, f"Assinatura de {name}")
    canvas_obj.drawCentredString(x2 + width_line / 2, y - 9, "Assinatura do Paciente/Responsável")

    canvas_obj.restoreState()


# =========================================================
# HOOK PADRÃO PARA TODAS AS PÁGINAS
# =========================================================


def _should_draw_signatures(doc) -> bool:
    """Define se o documento atual deve exibir assinaturas no rodapé."""
    return bool(getattr(doc, "include_signatures", False))


def on_page(canvas_obj, doc, user=None):
    draw_header(canvas_obj, doc)
    if _should_draw_signatures(doc):
        draw_signatures(canvas_obj, doc, user)


def draw_line_full_width(canvas_obj, doc):
    page_w, _ = doc.pagesize
    left_margin = getattr(doc, "leftMargin", PDF_MARGIN)
    right_margin = getattr(doc, "rightMargin", PDF_MARGIN)
    y_line = getattr(doc, "bottomMargin", PDF_BOTTOM_MARGIN) + 0.15 * cm

    canvas_obj.saveState()
    canvas_obj.setStrokeColor(colors.lightgrey)
    canvas_obj.setLineWidth(0.3)
    canvas_obj.line(left_margin, y_line, page_w - right_margin, y_line)
    canvas_obj.restoreState()


# =========================================================
# UTILIDADES PARA TABELAS
# =========================================================

bold_style = ParagraphStyle(
    "Bold",
    fontName=FONT_BOLD,
    fontSize=PDF_BODY_FONT_SIZE,
    leading=PDF_BODY_LEADING,
    alignment=TA_LEFT,
)
cell_style = ParagraphStyle(
    "Cell",
    fontName=FONT,
    fontSize=PDF_BODY_FONT_SIZE,
    leading=PDF_BODY_LEADING,
    alignment=TA_LEFT,
)


def cell_paragraph(text, is_bold=False):
    style = bold_style if is_bold else cell_style
    return Paragraph("" if text is None else str(text), style)


def user_name(user):
    if not user:
        return "Sem usuário"

    first_name = (getattr(user, "first_name", "") or "").strip()
    last_name = (getattr(user, "last_name", "") or "").strip()
    full_name = f"{first_name} {last_name}".strip()
    if full_name:
        return full_name

    full_name_fn = getattr(user, "get_full_name", None)
    if callable(full_name_fn):
        full_name = (full_name_fn() or "").strip()
        if full_name:
            return full_name

    username = (getattr(user, "username", None) or "").strip()
    if username:
        return username

    for attr in ("name", "email"):
        value = getattr(user, attr, None)
        if value:
            return str(value)

    return "Sem usuário"


def user_groups(user):
    if not user:
        return "Sem Grupo"

    groups = getattr(user, "groups", None)
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
                    name = getattr(g, "name", None)
                    if name:
                        nomes.append(name)
    except Exception:
        nomes = []

    return ", ".join(nomes) if nomes else "Sem Grupo"


def user_primary_group(user):
    groups_label = user_groups(user)
    if not groups_label or groups_label == "Sem Grupo":
        fallback_group = getattr(user, "group", None)
        if isinstance(fallback_group, str) and fallback_group.strip():
            return fallback_group.strip()
        if fallback_group is not None:
            fallback_group_name = getattr(fallback_group, "name", None)
            if fallback_group_name:
                return str(fallback_group_name).strip()
        return "Sem Grupo"

    parts = [part.strip() for part in str(groups_label).split(",") if part.strip()]
    return parts[0] if parts else "Sem Grupo"


def institutional_user_identity(user):
    return f"{user_primary_group(user)}: {user_name(user)}"


def document_title_style(name="HeadingDoc"):
    return ParagraphStyle(
        name,
        fontName=FONT_BOLD,
        fontSize=PDF_TITLE_FONT_SIZE,
        leading=PDF_TITLE_LEADING,
        textColor=colors.darkblue,
    )


def document_section_style(name="SectionDoc"):
    return ParagraphStyle(
        name,
        fontName=FONT_BOLD,
        fontSize=PDF_TITLE_FONT_SIZE,
        leading=PDF_TITLE_LEADING,
        textColor=colors.darkblue,
    )


def estilo_info_esquerda(name="InfoLeftDoc"):
    return ParagraphStyle(
        name,
        fontName=FONT,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        textColor=colors.HexColor("#333333"),
    )


def estilo_info_direita(name="InfoRightDoc"):
    return ParagraphStyle(
        name,
        fontName=FONT,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
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


gerar_qr_code = generate_qr_code
_sanitizar_code_barra = _sanitize_barcode
name_user = user_name
grupos_user = user_groups
grupo_principal_user = user_primary_group
identidade_user_institucional = institutional_user_identity
estilo_titulo_documento = document_title_style
estilo_secao_documento = document_section_style
