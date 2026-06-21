"""Etiqueta imprimível (impressora de etiquetas) com código de barras da requisição."""

from io import BytesIO

from reportlab.graphics.barcode import code128
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


LABEL_WIDTH = 60 * mm
LABEL_HEIGHT = 30 * mm


def abbreviate_patient_name(full_name: str, max_length: int = 28) -> str:
    """
    Abrevia nomes do meio com a inicial seguida de ponto.
    Ex: "José António da Silva Ferreira" → "José A. S. Ferreira"
    Mantém sempre o primeiro e o último nome completos.
    """
    if not full_name:
        return ""
    parts = full_name.strip().split()
    if len(parts) <= 2 or len(full_name) <= max_length:
        return full_name
    first = parts[0]
    last = parts[-1]
    middle_initials = " ".join(f"{p[0].upper()}." for p in parts[1:-1] if p)
    abbreviated = f"{first} {middle_initials} {last}"
    # Se ainda for longo demais, remove mais nomes do meio
    if len(abbreviated) > max_length and len(parts) > 3:
        abbreviated = f"{first} {last}"
    return abbreviated


def generate_request_label_pdf(lab_request) -> tuple[bytes, str]:
    """
    Gera uma etiqueta 60x30 mm com o código da requisição em Code128,
    nome do paciente (abreviado se necessário) e data/hora — pronta para
    impressoras de etiquetas (uma etiqueta por página).
    """
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(LABEL_WIDTH, LABEL_HEIGHT))

    raw_name = str(getattr(lab_request.patient, "name", "") or "")
    patient_name = abbreviate_patient_name(raw_name)
    code = str(lab_request.custom_id or lab_request.pk)

    when = lab_request.collected_at or lab_request.validated_at or lab_request.created_at
    when_text = when.strftime("%d/%m/%Y  %H:%M") if when else ""

    x = 2 * mm
    available_width = LABEL_WIDTH - 2 * x
    gap = 1 * mm          # espaço entre elementos e o barcode
    code_font_size = 7    # ~2.5mm de altura
    date_font_size = 9    # ~3.2mm de altura
    barcode_height = 10 * mm

    # ── Posicionamento a partir do centro (tudo colado ao barcode ±1 mm) ───
    # De baixo para cima:
    #   código  | gap 1mm | barcode | gap 1mm | data | nome
    code_baseline   = 1.5 * mm
    barcode_bottom  = code_baseline + 2.5 * mm + gap   # texto + gap
    barcode_top     = barcode_bottom + barcode_height
    date_baseline   = barcode_top + gap
    name_baseline   = date_baseline + 3.5 * mm + 0.5 * mm  # altura data + pequena folga

    # ── Código de barras ────────────────────────────────────────────────────
    bar_width = 0.24 * mm
    barcode = code128.Code128(code, barHeight=barcode_height, barWidth=bar_width, humanReadable=False, quiet=0)
    if barcode.width > available_width:
        bar_width = bar_width * available_width / barcode.width
        barcode = code128.Code128(code, barHeight=barcode_height, barWidth=bar_width, humanReadable=False, quiet=0)
    barcode.drawOn(pdf, x, barcode_bottom)

    # ── Código legível (abaixo do barcode, 1 mm de gap) ─────────────────────
    pdf.setFont("Helvetica", code_font_size)
    pdf.drawString(x, code_baseline, code)

    # ── Data/hora (acima do barcode, 1 mm de gap) ───────────────────────────
    if when_text:
        pdf.setFont("Helvetica", date_font_size)
        pdf.drawString(x, date_baseline, when_text)

    # ── Nome do paciente (acima da data) ────────────────────────────────────
    name_font_size = 11
    while name_font_size > 7 and pdf.stringWidth(patient_name, "Helvetica-Bold", name_font_size) > available_width:
        name_font_size -= 0.5
    pdf.setFont("Helvetica-Bold", name_font_size)
    pdf.drawString(x, name_baseline, patient_name)

    pdf.showPage()
    pdf.save()
    return buffer.getvalue(), f"etiqueta_{code}.pdf"
