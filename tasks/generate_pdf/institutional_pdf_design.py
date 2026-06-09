"""
Institutional PDF Design System
Padroniza o design institucional para todos os PDFs do projeto substrato
Baseado nas especificações:
- Layout A5 profissional
- Logotipo institucional em todas as páginas
- QR Code verificável (topo direito)
- Código de barras no header com dados essenciais
- Design único variado por tipo de documento
- Margens mínimas: 0.5cm
- Header mínimo: 2cm
- Footer mínimo: 0.5cm
- Corpo: 10pt, Títulos e destaques: 11pt bold
- Design limpo e institucional
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

logger = logging.getLogger("pdf.institutional")

# =========================================================
# CONFIGURAÇÕES INSTITUCIONAIS PADRÃO
# =========================================================

PAGE_SIZE = A5
PDF_MARGIN = 0.5 * cm          # Margem mínima: 0.5cm
PDF_HEADER_TOP_MARGIN = 2.0 * cm  # Header mínimo: 2cm
PDF_BOTTOM_MARGIN = 0.5 * cm  # Footer mínimo: 0.5cm
PDF_BODY_FONT_SIZE = 10       # Corpo: 10pt
PDF_TITLE_FONT_SIZE = 11      # Títulos e destaques: 11pt bold
PDF_BODY_LEADING = 12
PDF_TITLE_LEADING = 13

LOGO_PATH = os.path.join(settings.BASE_DIR, "static", "img", "logo.png")
ADD_FIM_PAGE = True

# =========================================================
# FONTES INSTITUCIONAIS
# =========================================================

def _first_existing(paths: list[str]) -> str | None:
    for p in paths:
        if p and os.path.exists(p):
            return p
    return None

def _configure_institutional_fonts() -> tuple[str, str]:
    """
    Define as fontes institucionais padrão para TODOS os PDFs.
    """
    try:
        pdfmetrics.getFont("Helvetica")
        pdfmetrics.getFont("Helvetica-Bold")
        logger.info("PDF fontes institucionais: Helvetica ativada.")
        return "Helvetica", "Helvetica-Bold"
    except Exception as err:
        logger.warning("Helvetica indisponível. Tentando Arial.", exc_info=err)

    base_dir = getattr(settings, "BASE_DIR", os.getcwd())
    arial_regular = _first_existing([
        os.path.join(base_dir, "static", "fonts", "arial.ttf"),
        os.path.join(base_dir, "static", "fonts", "Arial.ttf"),
        r"C:\Windows\Fonts\arial.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/arial.ttf",
    ])
    arial_bold = _first_existing([
        os.path.join(base_dir, "static", "fonts", "arialbd.ttf"),
        os.path.join(base_dir, "static", "fonts", "Arial-Bold.ttf"),
        r"C:\Windows\Fonts\arialbd.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/arialbd.ttf",
    ])

    if arial_regular and arial_bold:
        try:
            pdfmetrics.registerFont(TTFont("Arial", arial_regular))
            pdfmetrics.registerFont(TTFont("Arial-Bold", arial_bold))
            logger.info("PDF fontes institucionais: Arial ativada como fallback.")
            return "Arial", "Arial-Bold"
        except Exception as err:
            logger.warning("Falha ao registar Arial. A usar Helvetica builtin.", exc_info=err)

    logger.warning("Arial indisponível — usando Helvetica builtin.")
    return "Helvetica", "Helvetica-Bold"

FONT_INST, FONT_BOLD_INST = _configure_institutional_fonts()

# =========================================================
# SEGURANÇA DO PDF (PERMISSÕES)
# =========================================================

def pdf_encryption() -> StandardEncryption:
    """
    Torna o PDF "não editável" na prática (a maioria dos leitores respeita).
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
# UTILIDADES DE TEXTO
# =========================================================

def bold_inst(text: str) -> str:
    return f'<font name="{FONT_BOLD_INST}">{text}</font>'

def normal_inst(text: str) -> str:
    return f'<font name="{FONT_INST}">{text}</font>'

# =========================================================
# PROCESSAMENTO DE IMAGEM SEGURO
# =========================================================

@lru_cache(maxsize=2)
def _safe_image_reader(path: str):
    if not path or not os.path.exists(path):
        logger.warning("Logo institucional não encontrado: %s", path)
        return None

    try:
        with Image.open(path) as img:
            img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85, optimize=True)
            buf.seek(0)
            return ImageReader(buf)
    except Exception as err:
        logger.warning("Falha ao processar logo institucional.", exc_info=err)
        return None

# =========================================================
# QR CODE VERIFICÁVEL INSTITUCIONAL
# =========================================================

@lru_cache(maxsize=128)
def generate_institutional_qr_code(url: str):
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
        logger.warning("Erro ao gerar QR Code institucional.", exc_info=err)
        return None

# =========================================================
# TEXTO FINAL PADRÃO
# =========================================================

def append_fim_institucional(elements):
    if not ADD_FIM_PAGE or not isinstance(elements, list):
        return

    style = ParagraphStyle(
        "fim_inst",
        fontName=FONT_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#333333"),
    )

    elements.append(Spacer(1, 0.35 * cm))
    elements.append(Paragraph("Fim", style))

# =========================================================
# CANVAS INSTITUCIONAL COM NUMERAÇÃO + COMPRESSÃO
# =========================================================

class InstitutionalNumberedCanvas(rl_canvas.Canvas):
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
            self._draw_institutional_footer(total, now)
            rl_canvas.Canvas.showPage(self)

        rl_canvas.Canvas.save(self)
        return None

    def _draw_institutional_footer(self, total_pages, now_str):
        page_w, _ = self._pagesize

        try:
            self.setFont(FONT_INST, PDF_BODY_FONT_SIZE)
        except Exception:
            self.setFont("Helvetica", PDF_BODY_FONT_SIZE)

        footer = f"Gerado em {now_str} | Página {self._pageNumber}/{total_pages}"
        self.drawRightString(
            page_w - PDF_MARGIN,
            0.7 * cm,
            footer,
        )

# =========================================================
# CÓDIGO DE BARRAS (CODE128) INSTITUCIONAL
# =========================================================

def _sanitize_institutional_barcode(value: str) -> str:
    value = ("" if value is None else str(value)).strip()
    if not value:
        return ""
    # Remove acentos e limita a ASCII imprimível.
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.encode("ascii", "ignore").decode("ascii")
    return "".join(ch for ch in value if 32 <= ord(ch) <= 126)

def draw_institutional_barcode(canvas_obj, doc, x, y, max_width) -> None:
    value = getattr(doc, "barcode_value", None)
    payload = _sanitize_institutional_barcode(value)
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
        logger.warning("Falha ao desenhar código de barras institucional.", exc_info=err)


def draw_institutional_corner_barcode(canvas_obj, doc) -> None:
    """Desenha o código de barras (Code128) no quadrante inferior direito,
    encostado/transbordando pela margem da página.

    Fica vertical (rotacionado 90°) na faixa da margem direita, a sangrar
    pelo fundo — fora do corpo do documento e do rodapé (que é alinhado à
    direita até PDF_MARGIN)."""
    value = getattr(doc, "barcode_value", None)
    payload = _sanitize_institutional_barcode(value)
    if not payload:
        return

    page_w, _page_h = doc.pagesize
    try:
        bar = code128.Code128(payload, barHeight=0.40 * cm, barWidth=0.28)
        bar.humanReadable = False

        canvas_obj.saveState()
        # Origem encostada à borda direita; rotação 90° faz o comprimento do
        # código correr para cima e a altura entrar na faixa da margem direita.
        # ty negativo => transborda pelo fundo da página.
        canvas_obj.translate(page_w - 0.05 * cm, -0.40 * cm)
        canvas_obj.rotate(90)
        bar.drawOn(canvas_obj, 0, 0)
        canvas_obj.restoreState()
    except Exception as err:
        logger.warning("Falha ao desenhar código de barras de canto.", exc_info=err)

# =========================================================
# HEADER INSTITUCIONAL PADRÃO
# =========================================================

def draw_institutional_header(canvas_obj, doc):
    canvas_obj.saveState()

    page_w, page_h = doc.pagesize

    left_margin = getattr(doc, "leftMargin", PDF_MARGIN)
    right_margin = getattr(doc, "rightMargin", PDF_MARGIN)
    top_margin = getattr(doc, "topMargin", PDF_HEADER_TOP_MARGIN)

    logo = _safe_image_reader_transparent(LOGO_PATH)

    # Logo enquadrado DENTRO da banda do header (top_margin), sem transbordar o
    # topo da página e sem fundo opaco (leitor transparente + mask="auto").
    # preserveAspectRatio garante que a imagem cabe na caixa logo_w x logo_h.
    logo_w, logo_h = 2.4 * cm, 1.5 * cm
    logo_x = left_margin
    logo_y = page_h - 0.25 * cm - logo_h

    if logo:
        canvas_obj.drawImage(
            logo,
            logo_x,
            logo_y,
            width=logo_w,
            height=logo_h,
            preserveAspectRatio=True,
            anchor="nw",
            mask="auto",
        )
    else:
        canvas_obj.setFont(FONT_INST, PDF_BODY_FONT_SIZE)
        canvas_obj.drawString(logo_x, logo_y + 0.6 * cm, "LOGO INDISPONÍVEL")

    text_x = logo_x + logo_w + 0.4 * cm
    text_top_y = page_h - 0.62 * cm

    canvas_obj.setFont(FONT_BOLD_INST, PDF_TITLE_FONT_SIZE)
    canvas_obj.drawString(text_x, text_top_y, "CLÍNICA DE DIAGNÓSTICOS E SAÚDE")

    canvas_obj.setFont(FONT_INST, PDF_BODY_FONT_SIZE)
    canvas_obj.drawString(text_x, text_top_y - 0.48 * cm, "Laboratório de Análises Clínicas")

    canvas_obj.setFont(FONT_INST, PDF_BODY_FONT_SIZE)
    canvas_obj.drawString(text_x, text_top_y - 0.88 * cm, "Pemba - Cabo Delgado, Moçambique")

    canvas_obj.drawString(
        text_x,
        text_top_y - 1.24 * cm,
        "Tel/WhatsApp: +258 84 777 8476 | Email: substratosys@gmail.com",
    )

    # linha inferior (limite inferior da banda do header)
    y_line = page_h - top_margin + 0.05 * cm

    # QR Code topo direito (enquadrado na banda do header)
    qr_x = None
    if hasattr(doc, "qr_url") and doc.qr_url:
        qr = generate_institutional_qr_code(doc.qr_url)
        if qr:
            qr_size = 1.7 * cm
            qr_x = page_w - right_margin - qr_size
            qr_y = page_h - 0.25 * cm - qr_size
            canvas_obj.drawImage(qr, qr_x, qr_y, qr_size, qr_size, mask="auto")

    # (Código de barras removido do header: o QR já fornece verificação
    # máquina-legível e o header de 2cm não o acomoda sem sobrepor o texto.)

    canvas_obj.setStrokeColor(colors.darkblue)
    canvas_obj.setLineWidth(1)
    canvas_obj.line(left_margin, y_line, page_w - right_margin, y_line)

    canvas_obj.restoreState()

# =========================================================
# ASSINATURAS INSTITUCIONAIS
# =========================================================

def draw_institutional_signatures(canvas_obj, doc, user=None):
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

    canvas_obj.setFont(FONT_INST, PDF_BODY_FONT_SIZE)
    canvas_obj.drawCentredString(x1 + width_line / 2, y - 9, f"Assinatura de {name}")
    canvas_obj.drawCentredString(x2 + width_line / 2, y - 9, "Assinatura do Paciente/Responsável")

    canvas_obj.restoreState()

# =========================================================
# IDENTIDADE DO UTILIZADOR INSTITUCIONAL
# =========================================================

def _should_draw_institutional_signatures(doc) -> bool:
    """Define se o documento atual deve exibir assinaturas no rodapé."""
    return bool(getattr(doc, "include_signatures", False))

def user_name_inst(user):
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

def user_groups_inst(user):
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

def user_primary_group_inst(user):
    groups_label = user_groups_inst(user)
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
    return f"{user_primary_group_inst(user)}: {user_name_inst(user)}"

# =========================================================
# ESTILOS INSTITUCIONAIS PADRÃO
# =========================================================

def institutional_title_style(name="HeadingInst"):
    return ParagraphStyle(
        name,
        fontName=FONT_BOLD_INST,
        fontSize=PDF_TITLE_FONT_SIZE,
        leading=PDF_TITLE_LEADING,
        textColor=colors.darkblue,
    )

def institutional_section_style(name="SectionInst"):
    return ParagraphStyle(
        name,
        fontName=FONT_BOLD_INST,
        fontSize=PDF_TITLE_FONT_SIZE,
        leading=PDF_TITLE_LEADING,
        textColor=colors.darkblue,
    )

def institutional_info_left_style(name="InfoLeftInst"):
    return ParagraphStyle(
        name,
        fontName=FONT_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        textColor=colors.HexColor("#333333"),
    )

def institutional_info_right_style(name="InfoRightInst"):
    return ParagraphStyle(
        name,
        fontName=FONT_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        textColor=colors.HexColor("#333333"),
        alignment=TA_RIGHT,
    )

def institutional_bold_style(name="BoldInst"):
    return ParagraphStyle(
        name,
        fontName=FONT_BOLD_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_LEFT,
    )

def institutional_cell_style(name="CellInst"):
    return ParagraphStyle(
        name,
        fontName=FONT_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        alignment=TA_LEFT,
    )

def institutional_cell_paragraph(text, is_bold=False):
    style = institutional_bold_style("CellBold") if is_bold else institutional_cell_style("CellNormal")
    return Paragraph("" if text is None else str(text), style)

# =========================================================
# BLOCO DE IDENTIFICAÇÃO INSTITUCIONAL
# =========================================================

def institutional_montar_bloco_identificacao(usable_width, left_lines, right_lines):
    style_left = institutional_info_left_style("DocLeft")
    style_right = institutional_info_right_style("DocRight")

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

# =========================================================
# LINHA LARGURA TOTAL INSTITUCIONAL
# =========================================================

def institutional_draw_line_full_width(canvas_obj, doc):
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
# HOOK INSTITUCIONAL PADRÃO PARA TODAS AS PÁGINAS
# =========================================================

def institutional_on_page(canvas_obj, doc, user=None):
    draw_institutional_header(canvas_obj, doc)
    draw_institutional_corner_barcode(canvas_obj, doc)
    if _should_draw_institutional_signatures(doc):
        draw_institutional_signatures(canvas_obj, doc, user)

# =========================================================
# FUNÇÃO DE CRIAÇÃO DE DOCUMENTO INSTITUCIONAL PADRÃO
# =========================================================

def create_institutional_doc_template(buffer, title=""):
    """
    Cria um template de documento institucional padrão com todas as configurações.
    """
    page_width, _page_height = PAGE_SIZE

    left_margin = PDF_MARGIN
    right_margin = PDF_MARGIN
    top_margin = PDF_HEADER_TOP_MARGIN
    bottom_margin = PDF_BOTTOM_MARGIN

    usable_width = page_width - (left_margin + right_margin)

    from reportlab.platypus import SimpleDocTemplate

    doc = SimpleDocTemplate(
        buffer,
        pagesize=PAGE_SIZE,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
        encrypt=pdf_encryption(),
    )
    doc.include_signatures = True
    doc.title = title

    return doc, usable_width

# =========================================================
# FUNÇÃO DE BUILD DO PDF INSTITUCIONAL
# =========================================================

def build_institutional_pdf(doc, story, user=None, add_fim=True):
    """
    Constrói o PDF institucional com todas as configurações padronizadas.
    """
    if add_fim:
        append_fim_institucional(story)

    doc.build(
        story,
        onFirstPage=lambda c, d: (institutional_on_page(c, d, user), institutional_draw_line_full_width(c, d)),
        onLaterPages=lambda c, d: (institutional_on_page(c, d, user), institutional_draw_line_full_width(c, d)),
        canvasmaker=InstitutionalNumberedCanvas,
    )

    pdf_bytes = doc._buffer.getvalue() if hasattr(doc, '_buffer') else None
    if pdf_bytes is None and hasattr(doc, 'buffer'):
        pdf_bytes = doc.buffer.getvalue()

    return pdf_bytes

# =========================================================
# DOCUMENT TYPE DEFINITIONS
# =========================================================

class InstitutionalDocumentType:
    """Tipos de documentos suportados com configurações específicas."""

    LABORATORY_RESULT = "laboratory_result"
    NURSING_PROCEDURE = "nursing_procedure"
    MEDICAL_REPORT = "medical_report"
    PHARMACY_REPORT = "pharmacy_report"
    INVOICE = "invoice"
    RECEIPT = "receipt"
    ACTIVITY_REPORT = "activity_report"
    PATIENT_HISTORY = "patient_history"
    ANALYTICS = "analytics"
    REQUEST = "request"

    SECTOR_HEADERS = {
        LABORATORY_RESULT: {
            "title": "LABORATÓRIO DE ANÁLISES CLÍNICAS",
            "subtitle": "Resultado de Exames Laboratoriais",
            "color": colors.HexColor("#004B87"),  # Azul Laboratorial
            "icon_char": "⚗",
        },
        NURSING_PROCEDURE: {
            "title": "SERVIÇO DE ENFERMAGEM",
            "subtitle": "Relatório de Procedimento",
            "color": colors.HexColor("#D32F2F"),  # Vermelho Enfermagem
            "icon_char": "⊕",
        },
        MEDICAL_REPORT: {
            "title": "DEPARTAMENTO CLÍNICO",
            "subtitle": "Relatório Médico",
            "color": colors.HexColor("#1976D2"),  # Azul Médico
            "icon_char": "⚕",
        },
        PHARMACY_REPORT: {
            "title": "SERVIÇO DE FARMÁCIA",
            "subtitle": "Relatório de Movimento",
            "color": colors.HexColor("#388E3C"),  # Verde Farmácia
            "icon_char": "🗂",
        },
        INVOICE: {
            "title": "FATURAÇÃO",
            "subtitle": "Documento de Faturação",
            "color": colors.HexColor("#F57C00"),  # Laranja Faturação
            "icon_char": "📄",
        },
        RECEIPT: {
            "title": "RECEPÇÃO",
            "subtitle": "Comprovante de Pagamento",
            "color": colors.HexColor("#7B1FA2"),  # Roxo Recepção
            "icon_char": "✓",
        },
        ACTIVITY_REPORT: {
            "title": "RELATÓRIO DE ATIVIDADES",
            "subtitle": "Sumário de Operações",
            "color": colors.HexColor("#00838F"),  # Azul-esverdeado
            "icon_char": "📊",
        },
        PATIENT_HISTORY: {
            "title": "HISTÓRICO DO PACIENTE",
            "subtitle": "Informações Clínicas",
            "color": colors.HexColor("#C62828"),  # Vermelho Escuro
            "icon_char": "📋",
        },
        ANALYTICS: {
            "title": "ANÁLISE E ESTATÍSTICAS",
            "subtitle": "Indicadores Operacionais",
            "color": colors.HexColor("#0097A7"),  # Ciano
            "icon_char": "📈",
        },
        REQUEST: {
            "title": "REQUISIÇÃO DE EXAMES",
            "subtitle": "Pedido de Análises",
            "color": colors.HexColor("#455A64"),  # Cinza Azulado
            "icon_char": "📝",
        },
    }


# =========================================================
# PROCESSAMENTO DE LOGO COM FUNDO TRANSPARENTE (MELHORADO)
# =========================================================

@lru_cache(maxsize=2)
def _safe_image_reader_transparent(path: str):
    """
    Processa logo com suporte a fundo transparente.

    Converte para PNG com transparência, removendo fundos sólidos ou
    mantendo transparência se já existir.
    """
    if not path or not os.path.exists(path):
        logger.warning("Logo institucional não encontrado: %s", path)
        return None

    try:
        with Image.open(path) as img:
            # Se já tiver transparência, manter
            if img.mode == "RGBA" and img.info.get("transparency"):
                buf = io.BytesIO()
                img.save(buf, format="PNG", optimize=True)
                buf.seek(0)
                return ImageReader(buf)

            # Converter para RGBA para transparência
            if img.mode != "RGBA":
                img = img.convert("RGBA")

            # Se tiver fundo branco ou próximo de branco, tentar remover
            # Detectar cor dominante das bordas e remover
            if hasattr(img, "getextrema"):
                try:
                    # Simples: se a cor da borda é clara, tornar transparente
                    pixels = img.load()
                    _width, _height = img.size

                    # Amostrar cor da borda (canto superior esquerdo)
                    edge_color = pixels[0, 0]

                    # Se for branco ou muito claro (RGB > 200), remover
                    if len(edge_color) >= 3:
                        r, g, b = edge_color[:3]
                        if r > 200 and g > 200 and b > 200:
                            # Tornar fundo branco transparente
                            data = img.getdata()
                            new_data = []
                            for item in data:
                                r, g, b = item[:3]
                                if r > 200 and g > 200 and b > 200:
                                    new_data.append((r, g, b, 0))  # Transparente
                                else:
                                    new_data.append(item)
                            img.putdata(new_data)
                except Exception as e:
                    logger.debug("Não foi possível remover fundo. Mantendo original: %s", e)

            # Salvar como PNG com transparência
            buf = io.BytesIO()
            img.save(buf, format="PNG", optimize=True)
            buf.seek(0)
            logger.info("✓ Logo institucional processada com transparência")
            return ImageReader(buf)

    except Exception as err:
        logger.warning("Falha ao processar logo institucional com transparência.", exc_info=err)
        return None


# =========================================================
# ESTILOS INSTITUCIONAIS MELHORADOS
# =========================================================

def institutional_title_style(name="TitleInst", color=None):
    """Estilo para títulos principais dos documentos."""
    if color is None:
        color = colors.HexColor("#1A1A1A")
    return ParagraphStyle(
        name,
        fontName=FONT_BOLD_INST,
        fontSize=PDF_TITLE_FONT_SIZE,
        leading=PDF_TITLE_LEADING,
        textColor=color,
        alignment=TA_CENTER,
        spaceAfter=0.15*cm,
    )


def institutional_section_style(name="SectionInst", color=None):
    """Estilo para seções — com cor associada ao tipo de documento."""
    if color is None:
        color = colors.HexColor("#333333")
    return ParagraphStyle(
        name,
        fontName=FONT_BOLD_INST,
        fontSize=PDF_TITLE_FONT_SIZE,
        leading=PDF_TITLE_LEADING,
        textColor=color,
        spaceAfter=0.08*cm,
    )


def institutional_info_style(name="InfoInst"):
    """Estilo para informações — legível e bem espaçado."""
    return ParagraphStyle(
        name,
        fontName=FONT_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        textColor=colors.HexColor("#333333"),
        alignment=TA_LEFT,
    )


def institutional_info_right_style(name="InfoRightInst"):
    """Estilo para informações alinhadas à direita."""
    return ParagraphStyle(
        name,
        fontName=FONT_INST,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        textColor=colors.HexColor("#333333"),
        alignment=TA_RIGHT,
    )


def institutional_cell_style(is_bold=False, name="CellInst"):
    """Estilo para células de tabela."""
    font = FONT_BOLD_INST if is_bold else FONT_INST
    return ParagraphStyle(
        name,
        fontName=font,
        fontSize=PDF_BODY_FONT_SIZE,
        leading=PDF_BODY_LEADING,
        textColor=colors.HexColor("#1A1A1A"),
        alignment=TA_LEFT,
    )


def institutional_bold_text(text: str) -> str:
    """Formata texto em negrito com fonte institucional."""
    return f'<font name="{FONT_BOLD_INST}">{text}</font>'


def institutional_colored_text(text: str, color: str = "#1976D2") -> str:
    """Formata texto com cor."""
    return f'<font color="{color}">{text}</font>'


def institutional_bold_colored_text(text: str, color: str = "#1976D2") -> str:
    """Formata texto em negrito e colorido."""
    return f'<font name="{FONT_BOLD_INST}" color="{color}">{text}</font>'


# =========================================================
# MARGENS INSTITUCIONAIS PADRÃO
# =========================================================

class InstitutionalA5Margins:
    """Margens institucionais padronizadas para documentos A5."""

    LEFT = PDF_MARGIN
    RIGHT = PDF_MARGIN
    TOP = PDF_HEADER_TOP_MARGIN  # Header de 2cm
    BOTTOM = PDF_BOTTOM_MARGIN   # Footer de 0.5cm

    # Espaçamento padronizado
    SECTION_SPACING = 0.08 * cm
    ROW_SPACING = 0.06 * cm
    PARAGRAPH_SPACING = 0.05 * cm

    @classmethod
    def usable_width(cls) -> float:
        """Largura utilizável após margens."""
        page_w, _ = A5
        return page_w - (cls.LEFT + cls.RIGHT)


# =========================================================
# CABEÇALHO INSTITUCIONAL PERSONALIZADO POR TIPO DE DOCUMENTO
# =========================================================

def build_institutional_header_config(
    doc_type: str = InstitutionalDocumentType.LABORATORY_RESULT,
    tenant_name: str = "CLÍNICA DE DIAGNÓSTICOS E SAÚDE",
    logo_path: str | None = None,
) -> dict:
    """
    Constrói configuração personalizada de cabeçalho institucional.

    Args:
        doc_type: Um dos InstitutionalDocumentType.* constants
        tenant_name: Nome do tenant/instituição
        logo_path: Caminho opcional para logo

    Returns:
        Dicionário com configurações de cabeçalho
    """

    header_config = InstitutionalDocumentType.SECTOR_HEADERS.get(
        doc_type,
        InstitutionalDocumentType.SECTOR_HEADERS[InstitutionalDocumentType.LABORATORY_RESULT]
    )

    return {
        "doc_type": doc_type,
        "tenant_name": tenant_name or "CLÍNICA DE DIAGNÓSTICOS E SAÚDE",
        "sector_title": header_config.get("title", "DOCUMENTO INSTITUCIONAL"),
        "sector_subtitle": header_config.get("subtitle", ""),
        "sector_color": header_config.get("color", colors.HexColor("#1976D2")),
        "sector_icon": header_config.get("icon_char", "•"),
        "logo_path": logo_path or LOGO_PATH,
    }


def draw_institutional_header_improved(canvas_obj, doc, header_config: dict):
    """
    Desenha cabeçalho institucional personalizado com suporte a múltiplos tipos.
    Mantém o padrão: logo (esq), texto (centro), QR code (dir), código de barras (abaixo).

    Args:
        canvas_obj: ReportLab canvas
        doc: SimpleDocTemplate
        header_config: Resultado de build_institutional_header_config()
    """
    canvas_obj.saveState()

    page_w, page_h = doc.pagesize
    left_margin = getattr(doc, "leftMargin", PDF_MARGIN)
    right_margin = getattr(doc, "rightMargin", PDF_MARGIN)
    top_margin = getattr(doc, "topMargin", PDF_HEADER_TOP_MARGIN)

    logo = None
    logo_path = header_config.get("logo_path")
    if logo_path:
        logo = _safe_image_reader_transparent(logo_path)

    # Logo institucional (lado esquerdo) — enquadrado na banda do header
    # (sem transbordar o topo da página; preserveAspectRatio cabe na caixa).
    logo_w, logo_h = 2.4 * cm, 1.5 * cm
    logo_x = left_margin + 0.1 * cm
    logo_y = page_h - 0.25 * cm - logo_h

    if logo:
        try:
            canvas_obj.drawImage(
                logo,
                logo_x,
                logo_y,
                width=logo_w,
                height=logo_h,
                preserveAspectRatio=True,
                anchor="nw",
                mask="auto",
            )
        except Exception as e:
            logger.warning("Falha ao desenhar logo institucional: %s", e)

    # Texto do cabeçalho (centro - dinâmico por setor)
    text_x = logo_x + logo_w + 0.4 * cm
    text_top_y = page_h - 0.62 * cm

    sector_color = header_config.get("sector_color", colors.HexColor("#1976D2"))
    tenant_name = header_config.get("tenant_name", "CLÍNICA DE DIAGNÓSTICOS E SAÚDE")
    sector_title = header_config.get("sector_title", "DOCUMENTO")
    sector_subtitle = header_config.get("sector_subtitle", "")

    try:
        canvas_obj.setFillColor(sector_color)
        canvas_obj.setFont(FONT_BOLD_INST, PDF_TITLE_FONT_SIZE)
        canvas_obj.drawString(text_x, text_top_y, tenant_name.upper())

        canvas_obj.setFillColor(sector_color)
        canvas_obj.setFont(FONT_BOLD_INST, PDF_BODY_FONT_SIZE)
        canvas_obj.drawString(text_x, text_top_y - 0.50 * cm, sector_title)

        if sector_subtitle:
            canvas_obj.setFillColor(colors.HexColor("#666666"))
            canvas_obj.setFont(FONT_INST, PDF_BODY_FONT_SIZE)
            canvas_obj.drawString(text_x, text_top_y - 0.90 * cm, sector_subtitle)
    except Exception as e:
        logger.warning("Falha ao desenhar texto do cabeçalho institucional: %s", e)

    # Linha divisória no limite inferior da banda do header
    y_line = page_h - top_margin + 0.05 * cm
    canvas_obj.setStrokeColor(sector_color)
    canvas_obj.setLineWidth(1.5)
    canvas_obj.line(left_margin, y_line, page_w - right_margin, y_line)

    # QR Code topo direito (enquadrado na banda do header)
    qr_x = None
    if hasattr(doc, "qr_url") and doc.qr_url:
        qr = generate_institutional_qr_code(doc.qr_url)
        if qr:
            qr_size = 1.7 * cm
            qr_x = page_w - right_margin - qr_size
            qr_y = page_h - 0.25 * cm - qr_size
            canvas_obj.drawImage(qr, qr_x, qr_y, qr_size, qr_size, mask="auto")

    # (Código de barras removido do header: ver nota em draw_institutional_header.)

    canvas_obj.restoreState()


# =========================================================
# ASSINATURAS INSTITUCIONAIS
# =========================================================

def draw_institutional_signatures_improved(canvas_obj, doc, user=None):
    """Versão melhorada das assinaturas institucionais."""
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

    canvas_obj.setFont(FONT_INST, PDF_BODY_FONT_SIZE)
    canvas_obj.drawCentredString(x1 + width_line / 2, y - 9, f"Assinatura de {name}")
    canvas_obj.drawCentredString(x2 + width_line / 2, y - 9, "Assinatura do Paciente/Responsável")

    canvas_obj.restoreState()


# =========================================================
# IDENTIDADE DO UTILIZADOR INSTITUCIONAL (MELHORADA)
# =========================================================

def _should_draw_institutional_signatures(doc) -> bool:
    """Define se o documento atual deve exibir assinaturas no rodapé."""
    return bool(getattr(doc, "include_signatures", False))


def user_name_inst_improved(user):
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


def user_groups_inst_improved(user):
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


def user_primary_group_inst_improved(user):
    groups_label = user_groups_inst_improved(user)
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


def institutional_user_identity_improved(user):
    return f"{user_primary_group_inst_improved(user)}: {user_name_inst_improved(user)}"


# =========================================================
# CANVAS INSTITUCIONAL MELHORADO COM NUMERAÇÃO + COMPRESSÃO
# =========================================================

class ImprovedInstitutionalNumberedCanvas(rl_canvas.Canvas):
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
            self._draw_improved_institutional_footer(total, now)
            rl_canvas.Canvas.showPage(self)

        rl_canvas.Canvas.save(self)
        return None

    def _draw_improved_institutional_footer(self, total_pages, now_str):
        page_w, _ = self._pagesize

        try:
            self.setFont(FONT_INST, PDF_BODY_FONT_SIZE)
        except Exception:
            self.setFont("Helvetica", PDF_BODY_FONT_SIZE)

        footer = f"Gerado em {now_str} | Página {self._pageNumber}/{total_pages}"
        self.drawRightString(
            page_w - PDF_MARGIN,
            0.7 * cm,
            footer,
        )


# =========================================================
# LINHA LARGURA TOTAL INSTITUCIONAL MELHORADA
# =========================================================

def institutional_draw_line_full_width_improved(canvas_obj, doc):
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
# HOOK INSTITUCIONAL PADRÃO MELHORADO PARA TODAS AS PÁGINAS
# =========================================================

def improved_institutional_on_page(canvas_obj, doc, user=None):
    draw_institutional_header_improved(canvas_obj, doc, getattr(doc, "header_config", None))
    draw_institutional_corner_barcode(canvas_obj, doc)
    if _should_draw_institutional_signatures(doc):
        draw_institutional_signatures_improved(canvas_obj, doc, user)


# =========================================================
# FUNÇÃO DE CRIAÇÃO DE DOCUMENTO INSTITUCIONAL MELHORADA
# =========================================================

def create_improved_institutional_doc_template(buffer, title="", doc_type=None, tenant_name=None):
    """
    Cria um template de documento institucional melhorado com todas as configurações.
    """
    page_width, _page_height = A5

    left_margin = PDF_MARGIN
    right_margin = PDF_MARGIN
    top_margin = PDF_HEADER_TOP_MARGIN
    bottom_margin = PDF_BOTTOM_MARGIN

    usable_width = page_width - (left_margin + right_margin)

    from reportlab.platypus import SimpleDocTemplate

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A5,
        leftMargin=left_margin,
        rightMargin=right_margin,
        topMargin=top_margin,
        bottomMargin=bottom_margin,
        encrypt=pdf_encryption(),
    )

    # Configurar cabeçalho se tipo de documento for fornecido
    if doc_type or tenant_name:
        header_config = build_institutional_header_config(
            doc_type=doc_type or InstitutionalDocumentType.LABORATORY_RESULT,
            tenant_name=tenant_name,
        )
        doc.header_config = header_config
    else:
        doc.header_config = None

    doc.include_signatures = True
    doc.title = title

    return doc, usable_width


# =========================================================
# FUNÇÃO DE BUILD DO PDF INSTITUCIONAL MELHORADO
# =========================================================

def build_improved_institutional_pdf(doc, story, user=None, add_fim=True):
    """
    Constrói o PDF institucional melhorado com todas as configurações padronizadas.
    """
    if add_fim:
        append_fim_institucional(story)

    doc.build(
        story,
        onFirstPage=lambda c, d: (
            improved_institutional_on_page(c, d, user),
            institutional_draw_line_full_width_improved(c, d),
        ),
        onLaterPages=lambda c, d: (
            improved_institutional_on_page(c, d, user),
            institutional_draw_line_full_width_improved(c, d),
        ),
        canvasmaker=ImprovedInstitutionalNumberedCanvas,
    )

    pdf_bytes = doc._buffer.getvalue() if hasattr(doc, '_buffer') else None
    if pdf_bytes is None and hasattr(doc, 'buffer'):
        pdf_bytes = doc.buffer.getvalue()

    return pdf_bytes


# =========================================================
# ALIASES PARA COMPATIBILIDADE
# =========================================================

# Manter compatibilidade com funções existentes
gerar_qr_code = generate_institutional_qr_code
_sanitizar_code_barra = _sanitize_institutional_barcode
name_user = user_name_inst
grupos_user = user_groups_inst
grupo_principal_user = user_primary_group_inst
identidade_user_institucional = institutional_user_identity
estilo_titulo_documento = institutional_title_style
estilo_secao_documento = institutional_section_style
estilo_info_esquerda = institutional_info_left_style
estilo_info_direita = institutional_info_right_style
montar_bloco_identificacao = institutional_montar_bloco_identificacao
draw_line_full_width = institutional_draw_line_full_width
on_page = institutional_on_page
append_fim = append_fim_institucional
gerar_qr_code_institucional = generate_institutional_qr_code

# Aliases específicos para melhorias
institutional_bold_text = bold_inst
institutional_draw_header_improved = draw_institutional_header_improved
institutional_a5_margins = InstitutionalA5Margins
institutional_document_type = InstitutionalDocumentType
build_personalized_header = build_institutional_header_config
draw_header_improved = draw_institutional_header_improved