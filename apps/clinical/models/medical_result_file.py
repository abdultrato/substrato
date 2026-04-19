"""Arquivos de resultado de exames médicos (imagem/PDF/vídeo/DICOM)."""

from contextlib import suppress
import os

from django.core.exceptions import ValidationError
from django.db import models
from PIL import Image

from core.constants.medical_exam.medical_exam_result_type import MedicalExamResultType
from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import NoNameCoreModel

from .lab_request_item import LabRequestItem
from .medical_exam import MedicalExam
from .result import Result


def _medical_result_upload_to(instance, filename):
    parts = [
        "resultados_medicos",
        str(instance.result.tenant_id or "tenant"),
        instance.result.custom_id or str(instance.result_id),
        filename,
    ]
    return os.path.join(*parts)


EXTENSOES_POR_TIPO = {
    MedicalExamResultType.RELATORIO_PDF: {"pdf"},
    MedicalExamResultType.IMAGEM: {"jpg", "jpeg", "png", "webp", "tif", "tiff", "bmp", "gif"},
    MedicalExamResultType.DICOM: {"dcm", "dicom"},
    MedicalExamResultType.VIDEO: {"mp4", "mov", "avi", "mkv", "webm"},
}


def _extensao_file(name):
    if not name or "." not in name:
        return ""
    return name.rsplit(".", 1)[-1].lower()


def _ler_bytes(file, tamanho=4, offset=0):
    if not file:
        return b""
    try:
        pos = file.tell()
    except Exception:
        pos = None
    try:
        file.seek(offset)
        return file.read(tamanho) or b""
    finally:
        if pos is not None:
            with suppress(Exception):
                file.seek(pos)


def _validate_image(file):
    try:
        pos = file.tell()
    except Exception:
        pos = None
    try:
        file.seek(0)
        imagem = Image.open(file)
        imagem.verify()
    except Exception as err:
        raise ValidationError("Arquivo de imagem inválido.") from err
    finally:
        if pos is not None:
            with suppress(Exception):
                file.seek(pos)


def _validate_pdf(file):
    cabecalho = _ler_bytes(file, tamanho=4, offset=0)
    if cabecalho != b"%PDF":
        raise ValidationError("Arquivo PDF inválido.")


def validate_medical_file_for_type(file, type):
    if not file or not type:
        return
    exts = EXTENSOES_POR_TIPO.get(type)
    if exts:
        ext = _extensao_file(getattr(file, "name", "") or "")
        if ext not in exts:
            exts_fmt = ", ".join(sorted(exts))
            ext_fmt = ext or "desconhecida"
            raise ValidationError(f"Extensão '{ext_fmt}' inválida. Permitidas: {exts_fmt}.")
    if type == MedicalExamResultType.IMAGEM:
        _validate_image(file)
    if type == MedicalExamResultType.RELATORIO_PDF:
        _validate_pdf(file)


class MedicalResultFile(TenantPropagationMixin, NoNameCoreModel):
    """Arquivo associado a um resultado médico."""

    prefix = "RMA"  # Prefixo para IDs amigáveis

    result = models.ForeignKey(

        Result,

        db_column="result_id",
        on_delete=models.CASCADE,
        related_name="arquivos_medicos",
    )

    request_item = models.ForeignKey(

        LabRequestItem,

        db_column="request_item_id",
        on_delete=models.SET_NULL,
        related_name="arquivos_medicos",
        null=True,
        blank=True,
    )

    medical_exam = models.ForeignKey(

        MedicalExam,

        db_column="medical_exam_id",
        on_delete=models.PROTECT,
        related_name="arquivos",
    )

    type = models.CharField(

        db_column="type",

        max_length=20,
        choices=MedicalExamResultType.choices,
        default=MedicalExamResultType.IMAGEM,
        verbose_name="Tipo de file",
    )

    description = models.CharField(

        db_column="description",

        max_length=255,
        blank=True,
        verbose_name="Descrição/legenda",
    )

    file = models.FileField(

        db_column="file",

        upload_to=_medical_result_upload_to,
        verbose_name="Arquivo (PDF/Imagem/DICOM)",
    )

    class Meta:
        db_table = "clinico_resultadomedicoarquivo"
        verbose_name = "Arquivo de result médico"
        verbose_name_plural = "Arquivos de result médico"
        ordering = ["-created_at"]

    def clean(self):
        super().clean()
        erros = {}

        if self.medical_exam_id and self.type:
            tipos_permitidos = self.medical_exam.tipos_result_cadastrados
            if self.type not in tipos_permitidos:
                method = self.medical_exam.get_method_display() or self.medical_exam.method
                permitidos_fmt = ", ".join(sorted(tipos_permitidos))
                erros["type"] = (
                    f"Tipo não permitido para o método {method}. "
                    f"Permitidos: {permitidos_fmt}."
                )

        if self.file and self.type:
            try:
                validate_medical_file_for_type(self.file, self.type)
            except ValidationError as err:
                erros["file"] = err.messages[0] if err.messages else "Arquivo inválido."

        if erros:
            raise ValidationError(erros)

    def __str__(self):
        return f"{self.medical_exam.name or 'exam médico'} · {self.type}"
