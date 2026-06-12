"""Etiqueta imprimível (impressora de etiquetas) com código de barras da requisição."""

from io import BytesIO

from reportlab.graphics.barcode import code128
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


LABEL_WIDTH = 60 * mm
LABEL_HEIGHT = 30 * mm


def generate_request_label_pdf(lab_request) -> tuple[bytes, str]:
    """
    Gera uma etiqueta 60x30 mm com o código da requisição em Code128,
    nome do paciente e data/hora da colheita — pronta para impressoras
    de etiquetas (uma etiqueta por página).
    """
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(LABEL_WIDTH, LABEL_HEIGHT))

    patient_name = str(getattr(lab_request.patient, "name", "") or "")[:38]
    code = str(lab_request.custom_id or lab_request.pk)

    when = lab_request.collected_at or lab_request.validated_at or lab_request.created_at
    when_text = when.strftime("%d/%m/%Y %H:%M") if when else ""

    # Nome+data numa linha acima do código de barras; número por baixo.
    # Tudo alinhado à esquerda, na mesma coluna onde começa o código de barras.
    # quiet=0: sem margem interna do barcode — as barras começam exatamente
    # em `x`, alinhadas com o texto (a etiqueta já tem margem branca própria).
    x = 2 * mm
    available_width = LABEL_WIDTH - 2 * x
    bar_width = 0.24 * mm
    barcode = code128.Code128(code, barHeight=13 * mm, barWidth=bar_width, humanReadable=False, quiet=0)
    if barcode.width > available_width:
        bar_width = bar_width * available_width / barcode.width
        barcode = code128.Code128(code, barHeight=13 * mm, barWidth=bar_width, humanReadable=False, quiet=0)

    header = f"{patient_name}  ·  {when_text}" if when_text else patient_name
    font_size = 9
    while font_size > 6 and pdf.stringWidth(header, "Helvetica-Bold", font_size) > available_width:
        font_size -= 0.5
    pdf.setFont("Helvetica-Bold", font_size)
    pdf.drawString(x, 21.5 * mm, header)

    barcode.drawOn(pdf, x, 6.5 * mm)

    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(x, 2.2 * mm, code)

    pdf.showPage()
    pdf.save()
    return buffer.getvalue(), f"etiqueta_{code}.pdf"
