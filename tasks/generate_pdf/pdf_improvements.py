"""
PDF Improvements — Advanced Clinical Document Templates

✔ Personalized Headers by Document Type
✔ Tenant Name as Institution
✔ Optimized Fonts (Calibri, Segoe with Fallbacks)
✔ A5 Optimized Margins & Spacing
✔ Transparent Logo Background Processing
✔ Multi-sector Support (Lab, Nursing, Medical, Pharmacy, etc.)
✔ Professional Enterprise Grade
"""

from functools import lru_cache
import io
import logging
import os

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

logger = logging.getLogger("pdf.improvements")

# =========================================================
# DOCUMENT TYPE DEFINITIONS
# =========================================================

class DocumentType:
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
# FONTES OTIMIZADAS
# =========================================================

def _first_existing(paths: list[str]) -> str | None:
    """Encontra o primeiro arquivo de fonte que existe."""
    for p in paths:
        if p and os.path.exists(p):
            return p
    return None


def _configure_fonts_improved() -> tuple[str, str]:
    """
    Configura fontes otimizadas para documentos clínicos.

    Ordem de preferência:
    1) Calibri (Microsoft, muito legível para documentos)
    2) Segoe UI (Microsoft, profissional)
    3) Roboto (Google, sem serifa moderno)
    4) Liberation Sans (fallback livre)
    5) Helvetica (fallback final)
    """

    base_dir = getattr(settings, "BASE_DIR", os.getcwd())

    # 1) Calibri (preferido)
    calibri_paths = [
        os.path.join(base_dir, "static", "fonts", "Calibri.ttf"),
        os.path.join(base_dir, "static", "fonts", "calibri.ttf"),
        "/usr/share/fonts/truetype/msttcorefonts/Calibri.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]

    calibri_bold_paths = [
        os.path.join(base_dir, "static", "fonts", "Calibri-Bold.ttf"),
        os.path.join(base_dir, "static", "fonts", "calibrib.ttf"),
        "/usr/share/fonts/truetype/msttcorefonts/Calibri_Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]

    calibri_regular = _first_existing(calibri_paths)
    calibri_bold = _first_existing(calibri_bold_paths)

    if calibri_regular and calibri_bold:
        try:
            pdfmetrics.registerFont(TTFont("Calibri", calibri_regular))
            pdfmetrics.registerFont(TTFont("Calibri-Bold", calibri_bold))
            logger.info("✓ Fonte Calibri ativada (legível para documentos clínicos)")
            return "Calibri", "Calibri-Bold"
        except Exception as err:
            logger.warning("Falha ao registar Calibri. Tentando Segoe.", exc_info=err)

    # 2) Segoe UI (fallback Microsoft)
    segoe_paths = [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]

    segoe_bold_paths = [
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]

    segoe_regular = _first_existing(segoe_paths)
    segoe_bold = _first_existing(segoe_bold_paths)

    if segoe_regular and segoe_bold:
        try:
            pdfmetrics.registerFont(TTFont("Segoe", segoe_regular))
            pdfmetrics.registerFont(TTFont("Segoe-Bold", segoe_bold))
            logger.info("✓ Fonte Segoe/Liberation Sans ativada (fallback sem serifa)")
            return "Segoe", "Segoe-Bold"
        except Exception as err:
            logger.warning("Falha ao registar Segoe. Usando Helvetica.", exc_info=err)

    # 3) Fallback final (Helvetica)
    logger.warning("⚠ Fontes otimizadas não disponíveis — usando Helvetica (fallback)")
    return "Helvetica", "Helvetica-Bold"


FONT_IMPROVED, FONT_IMPROVED_BOLD = _configure_fonts_improved()


# =========================================================
# PROCESSAMENTO DE LOGO COM FUNDO TRANSPARENTE
# =========================================================

@lru_cache(maxsize=2)
def _safe_image_reader_transparent(path: str):
    """
    Processa logo com suporte a fundo transparente.

    Converte para PNG com transparência, removendo fundos sólidos ou
    mantendo transparência se já existir.
    """
    if not path or not os.path.exists(path):
        logger.warning("Logo não encontrado: %s", path)
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
            logger.info("✓ Logo processada com transparência")
            return ImageReader(buf)

    except Exception as err:
        logger.warning("Falha ao processar logo com transparência.", exc_info=err)
        return None


# =========================================================
# ESTILOS MELHORADOS
# =========================================================

def title_style_improved(name="TitleImproved"):
    """Estilo para títulos principais — grande e impactante."""
    return ParagraphStyle(
        name,
        fontName=FONT_IMPROVED_BOLD,
        fontSize=12,
        leading=14,
        textColor=colors.HexColor("#1A1A1A"),
        alignment=TA_CENTER,
        spaceAfter=0.15*cm,
    )


def subtitle_style_improved(name="SubtitleImproved"):
    """Estilo para subtítulos — setor e tipo de documento."""
    return ParagraphStyle(
        name,
        fontName=FONT_IMPROVED,
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#555555"),
        alignment=TA_CENTER,
        spaceAfter=0.10*cm,
    )


def section_style_improved(color=colors.HexColor("#1976D2"), name="SectionImproved"):
    """Estilo para seções — com cor associada ao tipo de documento."""
    return ParagraphStyle(
        name,
        fontName=FONT_IMPROVED_BOLD,
        fontSize=10,
        leading=12,
        textColor=color,
        spaceAfter=0.08*cm,
    )


def info_style_improved(name="InfoImproved"):
    """Estilo para informações — legível e bem espaçado."""
    return ParagraphStyle(
        name,
        fontName=FONT_IMPROVED,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#333333"),
        alignment=TA_LEFT,
    )


def info_right_style_improved(name="InfoRightImproved"):
    """Estilo para informações alinhadas à direita."""
    return ParagraphStyle(
        name,
        fontName=FONT_IMPROVED,
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#333333"),
        alignment=TA_RIGHT,
    )


def cell_style_improved(is_bold=False, name="CellImproved"):
    """Estilo para células de tabela."""
    font = FONT_IMPROVED_BOLD if is_bold else FONT_IMPROVED
    return ParagraphStyle(
        name,
        fontName=font,
        fontSize=8,
        leading=9,
        textColor=colors.HexColor("#1A1A1A"),
        alignment=TA_LEFT,
    )


# =========================================================
# MARGENS OTIMIZADAS PARA A5
# =========================================================

class A5Margins:
    """Margens otimizadas para documentos A5 (tamanho reduzido)."""

    # Margens mínimas (0.8 cm = ~0.3 polegadas)
    LEFT = 0.8 * cm
    RIGHT = 0.8 * cm
    TOP = 3.5 * cm  # Para cabeçalho
    BOTTOM = 1.8 * cm

    # Espaçamento compacto
    SECTION_SPACING = 0.08 * cm
    ROW_SPACING = 0.06 * cm
    PARAGRAPH_SPACING = 0.05 * cm

    @classmethod
    def usable_width(cls) -> float:
        """Largura utilizável após margens."""
        page_w, _ = A5
        return page_w - (cls.LEFT + cls.RIGHT)


# =========================================================
# CABEÇALHO PERSONALIZADO POR TIPO DE DOCUMENTO
# =========================================================

def build_personalized_header(
    doc_type: str = DocumentType.LABORATORY_RESULT,
    tenant_name: str = "INSTITUIÇÃO",
    logo_path: str | None = None,
) -> dict:
    """
    Constrói configuração personalizada de cabeçalho.

    Args:
        doc_type: Um dos DocumentType.* constants
        tenant_name: Nome do tenant/instituição
        logo_path: Caminho opcional para logo

    Returns:
        Dicionário com configurações de cabeçalho
    """

    header_config = DocumentType.SECTOR_HEADERS.get(
        doc_type,
        DocumentType.SECTOR_HEADERS[DocumentType.LABORATORY_RESULT]
    )

    return {
        "doc_type": doc_type,
        "tenant_name": tenant_name or "INSTITUIÇÃO",
        "sector_title": header_config.get("title", "DOCUMENTO"),
        "sector_subtitle": header_config.get("subtitle", ""),
        "sector_color": header_config.get("color", colors.HexColor("#1976D2")),
        "sector_icon": header_config.get("icon_char", "•"),
        "logo_path": logo_path,
    }


def draw_header_improved(canvas_obj, doc, header_config: dict):
    """
    Desenha cabeçalho personalizado com suporte a múltiplos tipos.

    Args:
        canvas_obj: ReportLab canvas
        doc: SimpleDocTemplate
        header_config: Resultado de build_personalized_header()
    """
    canvas_obj.saveState()

    page_w, page_h = doc.pagesize
    left_margin = getattr(doc, "leftMargin", A5Margins.LEFT)
    right_margin = getattr(doc, "rightMargin", A5Margins.RIGHT)
    top_margin = getattr(doc, "topMargin", A5Margins.TOP)

    logo = None
    logo_path = header_config.get("logo_path")
    if logo_path:
        logo = _safe_image_reader_transparent(logo_path)

    # Logo
    logo_w, logo_h = 2.8 * cm, 2.3 * cm
    logo_x = left_margin + 0.1 * cm
    logo_y = page_h - top_margin + 0.8 * cm

    if logo:
        try:
            canvas_obj.drawImage(
                logo,
                logo_x,
                logo_y,
                width=logo_w,
                height=logo_h,
                preserveAspectRatio=True,
                mask="auto",
            )
        except Exception as e:
            logger.warning("Falha ao desenhar logo: %s", e)

    # Texto do cabeçalho (dinâmico por setor)
    text_x = logo_x + logo_w + 0.4 * cm
    text_top_y = logo_y + logo_h - 0.25 * cm

    sector_color = header_config.get("sector_color", colors.HexColor("#1976D2"))
    tenant_name = header_config.get("tenant_name", "INSTITUIÇÃO")
    sector_title = header_config.get("sector_title", "DOCUMENTO")
    sector_subtitle = header_config.get("sector_subtitle", "")

    try:
        canvas_obj.setFillColor(sector_color)
        canvas_obj.setFont(FONT_IMPROVED_BOLD, 10)
        canvas_obj.drawString(text_x, text_top_y, tenant_name.upper())

        canvas_obj.setFillColor(sector_color)
        canvas_obj.setFont(FONT_IMPROVED_BOLD, 9)
        canvas_obj.drawString(text_x, text_top_y - 0.50 * cm, sector_title)

        if sector_subtitle:
            canvas_obj.setFillColor(colors.HexColor("#666666"))
            canvas_obj.setFont(FONT_IMPROVED, 8)
            canvas_obj.drawString(text_x, text_top_y - 0.90 * cm, sector_subtitle)
    except Exception as e:
        logger.warning("Falha ao desenhar texto do cabeçalho: %s", e)

    # Linha divisória
    y_line = logo_y - 0.25 * cm
    canvas_obj.setStrokeColor(sector_color)
    canvas_obj.setLineWidth(1.5)
    canvas_obj.line(left_margin, y_line, page_w - right_margin, y_line)

    canvas_obj.restoreState()


# =========================================================
# UTILITIES
# =========================================================

def bold_text(text: str) -> str:
    """Formata texto em negrito com fonte melhorada."""
    return f'<font name="{FONT_IMPROVED_BOLD}">{text}</font>'


def colored_text(text: str, color: str = "#1976D2") -> str:
    """Formata texto com cor."""
    return f'<font color="{color}">{text}</font>'


def bold_colored_text(text: str, color: str = "#1976D2") -> str:
    """Formata texto em negrito e colorido."""
    return f'<font name="{FONT_IMPROVED_BOLD}" color="{color}">{text}</font>'


__all__ = [
    "FONT_IMPROVED",
    "FONT_IMPROVED_BOLD",
    "A5Margins",
    "DocumentType",
    "bold_colored_text",
    "bold_text",
    "build_personalized_header",
    "cell_style_improved",
    "colored_text",
    "draw_header_improved",
    "info_right_style_improved",
    "info_style_improved",
    "section_style_improved",
    "subtitle_style_improved",
    "title_style_improved",
]
