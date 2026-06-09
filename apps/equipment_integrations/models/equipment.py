"""Equipamentos integrados (HL7/ASTM/DICOM/HTTP/TCP) e seus metadados."""

from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator
from django.utils import timezone

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
        IMUNOLOGIA = "IMU", "Imunologia"
        COAGULACAO = "COAG", "Coagulação"
        URINALISE = "URI", "Urinálise"
        GASOMETRIA = "GAS", "Gasometria"
        ECOGRAFIA = "US", "Ecografia (Ultrassom)"
        RAIOS_X = "XR", "Raios-X"
        TOMOGRAFIA = "CT", "Tomografia"
        RESSONANCIA = "MRI", "Ressonância magnética"
        MAMOGRAFIA = "MG", "Mamografia"
        ECOCARDIOGRAMA = "ECHO", "Ecocardiograma"
        HOLTER = "HOLTER", "Holter"
        MAPA = "MAPA", "MAPA"
        EEG = "EEG", "Eletroencefalograma"
        OCT = "OCT", "Tomografia de coerência óptica"
        CAMPO_VISUAL = "VISUAL_FIELD", "Campo visual"
        TOPOGRAFIA_CORNEAL = "CORNEAL_TOPOGRAPHY", "Topografia corneal"
        OUTRO = "OUT", "Outro"

    class Protocolo(models.TextChoices):
        HTTP_JSON = "HTTP_JSON", "HTTP (JSON)"
        HL7_MLLP = "HL7_MLLP", "HL7 v2 (MLLP)"
        ASTM_TCP = "ASTM_TCP", "ASTM (TCP)"
        TCP_JSON = "TCP_JSON", "TCP/IP JSON"
        TCP_RAW = "TCP_RAW", "TCP/IP bruto"
        DICOM = "DICOM", "DICOM"
        FILE_DROP = "FILE_DROP", "File drop (pasta)"

    class ConnectionMode(models.TextChoices):
        PASSIVE_API = "PASSIVE_API", "API passiva"
        TCP_SERVER = "TCP_SERVER", "Servidor TCP/IP"
        TCP_CLIENT = "TCP_CLIENT", "Cliente TCP/IP"

    class TcpFraming(models.TextChoices):
        JSON_LINE = "JSON_LINE", "JSON por linha"
        MLLP = "MLLP", "HL7 MLLP"
        ASTM = "ASTM", "ASTM"
        RAW = "RAW", "Bruto"

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

    connection_mode = models.CharField(
        db_column="connection_mode",
        verbose_name="Modo de comunicação",
        max_length=20,
        choices=ConnectionMode.choices,
        default=ConnectionMode.PASSIVE_API,
        db_index=True,
    )
    tcp_host = models.CharField(
        db_column="tcp_host",
        verbose_name="Host TCP/IP",
        max_length=120,
        blank=True,
        default="",
        help_text="Endereço do equipamento ou interface local para escuta.",
    )
    tcp_port = models.PositiveIntegerField(
        db_column="tcp_port",
        verbose_name="Porta TCP/IP",
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(65535)],
    )
    tcp_timeout_seconds = models.PositiveSmallIntegerField(
        db_column="tcp_timeout_seconds",
        verbose_name="Timeout TCP/IP (s)",
        default=30,
        validators=[MinValueValidator(1), MaxValueValidator(600)],
    )
    tcp_framing = models.CharField(
        db_column="tcp_framing",
        verbose_name="Enquadramento TCP/IP",
        max_length=20,
        choices=TcpFraming.choices,
        default=TcpFraming.JSON_LINE,
    )
    encoding = models.CharField(
        db_column="encoding",
        verbose_name="Codificação",
        max_length=40,
        blank=True,
        default="utf-8",
    )
    auto_consume_results = models.BooleanField(
        db_column="auto_consume_results",
        verbose_name="Consumir resultados automaticamente",
        default=True,
        db_index=True,
    )
    supported_exam_types = models.JSONField(
        db_column="supported_exam_types",
        verbose_name="Tipos de exame suportados",
        default=list,
        blank=True,
        help_text="Ex.: LAB, MED, RAD, SDX, ECG, EEG, OCT.",
    )
    last_seen_at = models.DateTimeField(
        db_column="last_seen_at",
        verbose_name="Última comunicação",
        null=True,
        blank=True,
        db_index=True,
    )

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
            models.Index(fields=["tenant", "connection_mode", "active"]),
            models.Index(fields=["tenant", "last_seen_at"]),
        ]

    def __str__(self) -> str:
        return self.name or f"Equipamento {self.pk}"

    def mark_seen(self, when=None):
        self.last_seen_at = when or timezone.now()
        self.save(update_fields=["last_seen_at", "updated_at"])

    marcar_comunicacao = mark_seen

    def activate(self):
        """Ativa o equipamento para integração (§28.6)."""
        self.active = True
        self.save(update_fields=["active", "updated_at"])
        return self

    def deactivate(self):
        """Suspende/inativa o equipamento — deixa de processar mensagens de produção."""
        self.active = False
        self.save(update_fields=["active", "updated_at"])
        return self
