from django.db import models


class TipoDocumento(models.TextChoices):
    """
    Tipos de documento pessoais e institucionais.
    """

    BI = "BI", "Bilhete de Identidade"
    PASSAPORTE = "PASS", "Passaporte"
    DIRE = "DIRE", "Documento de Identificação de Residente Estrangeiro"
    CARTA_CONDUCAO = "CC", "Carta de Condução"
    NUIT = "NUIT", "Número Único de Identificação Tributária"
    CARTAO_ELEITOR = "CE", "Cartão de Eleitor"
    CERTIDAO_NASCIMENTO = "CN", "Certidão de Nascimento"
    OUTRO = "OUT", "Outro"
