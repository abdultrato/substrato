from django.utils import timezone


def generate_invoice_number(invoice):
    """
    Generates a readable sequential invoice number.

    Formato sugerido:
    FAT-ANO-MES-SEQUENCIAL
    """

    current_date = timezone.now()

    year = current_date.strftime("%Y")
    month = current_date.strftime("%m")

    sequence = invoice.id_custom[-6:]

    return f"FAT-{year}{month}-{sequence}"


def generate_receipt_number(receipt):
    """
    Generates a readable receipt number.
    """

    current_date = timezone.now()

    year = current_date.strftime("%Y")
    month = current_date.strftime("%m")

    sequence = str(receipt.id).zfill(6)

    return f"REC-{year}{month}-{sequence}"


gerar_numero_fatura = generate_invoice_number
gerar_numero_recibo = generate_receipt_number
