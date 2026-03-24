from django.utils import timezone


def gerar_numero_fatura(fatura):
    """
    Gera número legível e sequencial para documentos financeiros.

    Formato sugerido:
    FAT-ANO-MES-SEQUENCIAL
    """

    data = timezone.now()

    ano = data.strftime("%Y")
    mes = data.strftime("%m")

    sequencial = fatura.id_custom[-6:]  # usa parte final do id custom

    return f"FAT-{ano}{mes}-{sequencial}"


def gerar_numero_recibo(recibo):
    """
    Gera número legível para recibos.
    """

    data = timezone.now()

    ano = data.strftime("%Y")
    mes = data.strftime("%m")

    sequencial = str(recibo.id).zfill(6)

    return f"REC-{ano}{mes}-{sequencial}"
