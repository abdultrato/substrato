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

    # Topo: nome (destaque) e data; por baixo do código de barras só o número.
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawCentredString(LABEL_WIDTH / 2, LABEL_HEIGHT - 5.5 * mm, patient_name)
    pdf.setFont("Helvetica", 8)
    pdf.drawCentredString(LABEL_WIDTH / 2, LABEL_HEIGHT - 9.5 * mm, when_text)

    barcode = code128.Code128(code, barHeight=11 * mm, barWidth=0.24 * mm, humanReadable=False)
    x = max((LABEL_WIDTH - barcode.width) / 2, 1 * mm)
    barcode.drawOn(pdf, x, 6.5 * mm)

    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawCentredString(LABEL_WIDTH / 2, 2.2 * mm, code)

    pdf.showPage()
    pdf.save()
    return buffer.getvalue(), f"etiqueta_{code}.pdf"
