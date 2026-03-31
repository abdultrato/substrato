"""Tipos de documento pessoais e institucionais (enum codificado)."""

from django.db import models


class DocumentType(models.TextChoices):
    """Enum de documentos de identificação suportados."""

    BI = "BI", "Bilhete de Identidade"
    PASSAPORTE = "PASS", "Passaporte"
    DIRE = "DIRE", "Documento de Identificação de Residente Estrangeiro"
    CARTA_CONDUCAO = "CC", "Carta de Condução"
    NUIT = "NUIT", "Número Único de Identificação Tributária"
    CARTAO_ELEITOR = "CE", "Cartão de Eleitor"
    CERTIDAO_NASCIMENTO = "CN", "Certidão de Nascimento"
    OUTRO = "OUT", "Outro"


__all__ = ["DocumentType"]
