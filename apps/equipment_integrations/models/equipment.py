"""Equipamentos integrados (HL7/ASTM/DICOM/HTTP) e seus metadados."""

from django.db import models

from core.models.base import CoreModel


class IntegrationEquipment(CoreModel):
    """
    Equipamento integrado ao sistema (analisadores, ECG, modalidades de imagem, etc).

    Observação: a "integração enterprise" normalmente é feita via middleware (HL7/ASTM/DICOM),
    mas este model permite cadastrar o equipment, credenciais e roteamento para um
    pipeline de integração.
    """

    prefix = "EQP"  # Prefixo para IDs amigáveis

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

    modality = models.CharField(
        db_column="modality",
        verbose_name="Modalidade",
        max_length=20,
        choices=Modalidade.choices,
        default=Modalidade.OUTRO,
        db_index=True,
    )
    protocol = models.CharField(
        db_column="protocol",
        verbose_name="Protocolo",
        max_length=20,
        choices=Protocolo.choices,
        default=Protocolo.HTTP_JSON,
        db_index=True,
    )

    manufacturer = models.CharField(
        db_column="manufacturer",
        verbose_name="Fabricante",
        max_length=120, blank=True, default="")
    model = models.CharField(
        db_column="model",
        verbose_name="Modelo",
        max_length=120, blank=True, default="")
    serial_number = models.CharField(
        db_column="serial_number",
        verbose_name="Número de série",
        max_length=120, blank=True, default="", db_index=True)

    active = models.BooleanField(
        db_column="active",
        verbose_name="Ativo",
        default=True, db_index=True)

    # Configuração flexível (host/port, parâmetros de parsing, etc).
    config = models.JSONField(verbose_name="Configuração", default=dict, blank=True)

    class Meta:
        db_table = "integracoes_equipamentos_integracaoequipamento"
        verbose_name = "Equipamento (Integração)"
        verbose_name_plural = "Equipamentos (Integração)"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "modality"]),
            models.Index(fields=["tenant", "protocol"]),
            models.Index(fields=["tenant", "active"]),
        ]

    def __str__(self) -> str:
        return self.name or f"Equipamento {self.pk}"
