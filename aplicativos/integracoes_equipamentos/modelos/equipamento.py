from django.db import models

from nucleo.modelos.base import CoreModel


class IntegracaoEquipamento(CoreModel):
    """
    Equipamento integrado ao sistema (analisadores, ECG, modalidades de imagem, etc).

    Observação: a "integração enterprise" normalmente é feita via middleware (HL7/ASTM/DICOM),
    mas este modelo permite cadastrar o equipamento, credenciais e roteamento para um
    pipeline de integração.
    """

    prefixo = "EQP"

    class Modalidade(models.TextChoices):
        ECG = "ECG", "Eletrocardiograma"
        HEMOGRAMA = "HEM", "Hemograma (Hematologia)"
        BIOQUIMICA = "BIO", "Bioquímica"
        ECOGRAFIA = "US", "Ecografia (Ultrassom)"
        RAIOS_X = "XR", "Raios-X"
        OUTRO = "OUT", "Outro"

    class Protocolo(models.TextChoices):
        HTTP_JSON = "HTTP_JSON", "HTTP (JSON)"
        HL7_MLLP = "HL7_MLLP", "HL7 v2 (MLLP)"
        ASTM_TCP = "ASTM_TCP", "ASTM (TCP)"
        DICOM = "DICOM", "DICOM"
        FILE_DROP = "FILE_DROP", "File drop (pasta)"

    modalidade = models.CharField(
        max_length=20,
        choices=Modalidade.choices,
        default=Modalidade.OUTRO,
        db_index=True,
    )
    protocolo = models.CharField(
        max_length=20,
        choices=Protocolo.choices,
        default=Protocolo.HTTP_JSON,
        db_index=True,
    )

    fabricante = models.CharField(max_length=120, blank=True, default="")
    modelo = models.CharField(max_length=120, blank=True, default="")
    numero_serie = models.CharField(max_length=120, blank=True, default="", db_index=True)

    ativo = models.BooleanField(default=True, db_index=True)

    # Configuração flexível (host/port, parâmetros de parsing, etc).
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Equipamento (Integração)"
        verbose_name_plural = "Equipamentos (Integração)"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["inquilino", "modalidade"]),
            models.Index(fields=["inquilino", "protocolo"]),
            models.Index(fields=["inquilino", "ativo"]),
        ]

    def __str__(self) -> str:
        return self.nome or f"Equipamento {self.pk}"
