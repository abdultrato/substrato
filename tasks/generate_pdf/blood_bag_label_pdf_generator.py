"""Etiqueta imprimível (impressora de etiquetas) com código de barras da bolsa de sangue."""

from io import BytesIO

from reportlab.graphics.barcode import code128
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


LABEL_WIDTH = 60 * mm
LABEL_HEIGHT = 30 * mm

_UNKNOWN_BLOOD_TYPE = "UNK"


def _blood_type_text(donation) -> str:
    value = str(getattr(donation, "blood_type", "") or "").strip()
    if not value or value == _UNKNOWN_BLOOD_TYPE:
        return "—"
    return value


def generate_blood_bag_label_pdf(donation) -> tuple[bytes, str]:
    """
    Gera uma etiqueta 60x30 mm com o identificador da bolsa em Code128, nome do
    doador, tipo sanguíneo e data/hora da coleta — pronta para impressoras de
    etiquetas (uma etiqueta por página).
    """
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=(LABEL_WIDTH, LABEL_HEIGHT))

    donor_name = str(getattr(getattr(donation, "donor", None), "name", "") or "")[:38]
    code = str(donation.bag_identifier or donation.custom_id or donation.pk)
    blood_type = _blood_type_text(donation)

    when = getattr(donation, "collected_at", None) or getattr(donation, "created_at", None)
    when_text = when.strftime("%d/%m/%Y %H:%M") if when else ""

    # Mesma estrutura da etiqueta de requisição: cabeçalho (nome + data) acima do
    # código de barras e o código por baixo. quiet=0 alinha as barras ao texto.
    x = 2 * mm
    available_width = LABEL_WIDTH - 2 * x
    bar_width = 0.24 * mm
    barcode = code128.Code128(code, barHeight=12 * mm, barWidth=bar_width, humanReadable=False, quiet=0)
    if barcode.width > available_width:
        bar_width = bar_width * available_width / barcode.width
        barcode = code128.Code128(code, barHeight=12 * mm, barWidth=bar_width, humanReadable=False, quiet=0)

    header = f"{donor_name}  ·  {when_text}" if when_text else donor_name
    font_size = 9
    while font_size > 6 and pdf.stringWidth(header, "Helvetica-Bold", font_size) > available_width:
        font_size -= 0.5
    pdf.setFont("Helvetica-Bold", font_size)
    pdf.drawString(x, 24.5 * mm, header)

    # Tipo sanguíneo em destaque no canto superior direito.
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawRightString(LABEL_WIDTH - x, 20.2 * mm, blood_type)

    barcode.drawOn(pdf, x, 6 * mm)

    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(x, 2 * mm, code)

    pdf.showPage()
    pdf.save()
    return buffer.getvalue(), f"etiqueta_bolsa_{code}.pdf".replace("/", "-")
