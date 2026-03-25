from django.utils import timezone


def generate_invoice_number(invoice):
    """
    Gera um número sequencial legível para a invoice.

    Formato sugerido:
    FAT-ANO-MES-SEQUENCIAL
    """

    current_date = timezone.now()

    year = current_date.strftime("%Y")
    month = current_date.strftime("%m")

    sequence = invoice.custom_id[-6:]

    return f"FAT-{year}{month}-{sequence}"


def generate_receipt_number(receipt):
    """
    Gera um número legível para o recibo.
    """

    current_date = timezone.now()

    year = current_date.strftime("%Y")
    month = current_date.strftime("%m")

    sequence = str(receipt.id).zfill(6)

    return f"REC-{year}{month}-{sequence}"


__all__ = ["generate_invoice_number", "generate_receipt_number"]
